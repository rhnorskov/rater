import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
	type Comparison,
	fit,
	pairsFromOrder,
} from "../src/lib/ranking/bradley-terry.ts";
import type { Database } from "../src/lib/supabase/database.types.ts";

// PostgREST caps a response, so every read has to page.
const PAGE = 1000;
const WRITE_CHUNK = 500;
// A film on one list has no disagreement behind it, so there is no magnitude to report.
// Below this the score is withheld rather than guessed — see docs/rating-model.md.
const MIN_RATERS = 2;

const env = z
	.object({
		NEXT_PUBLIC_SUPABASE_URL: z.url(),
		SUPABASE_SECRET_KEY: z.string().min(1),
	})
	.parse(process.env);

type Supabase = SupabaseClient<Database>;

/**
 * Every user's list, best first. The secret key is required: the fit needs all users'
 * orders, which RLS deliberately hides from the app.
 */
async function readLists(supabase: Supabase): Promise<Map<string, string[]>> {
	const lists = new Map<string, string[]>();

	for (let from = 0; ; from += PAGE) {
		const { data, error } = await supabase
			.from("rankings")
			// (user_id, rank) is unique, so this total order makes paging stable.
			.select("user_id, movie_id, rank")
			.order("user_id", { ascending: true })
			.order("rank", { ascending: true })
			.range(from, from + PAGE - 1);

		if (error) {
			throw new Error(`could not read rankings: ${error.message}`);
		}

		for (const row of data) {
			const list = lists.get(row.user_id) ?? [];
			list.push(row.movie_id);
			lists.set(row.user_id, list);
		}

		if (data.length < PAGE) {
			return lists;
		}
	}
}

function* comparisonsFrom(lists: Iterable<string[]>): Generator<Comparison> {
	for (const list of lists) {
		yield* pairsFromOrder(list);
	}
}

async function main() {
	console.log(`target: ${env.NEXT_PUBLIC_SUPABASE_URL}`);

	const supabase = createClient<Database>(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.SUPABASE_SECRET_KEY,
		{ auth: { persistSession: false, autoRefreshToken: false } },
	);

	const lists = await readLists(supabase);
	const sizes = [...lists.values()].map((list) => list.length);

	if (sizes.length === 0) {
		console.log("no lists to fit");
		return;
	}

	console.log(
		`${lists.size} lists, ${Math.min(...sizes)}–${Math.max(...sizes)} films each`,
	);

	const raters = new Map<string, number>();
	for (const list of lists.values()) {
		for (const movieId of list) {
			raters.set(movieId, (raters.get(movieId) ?? 0) + 1);
		}
	}

	const started = performance.now();
	const result = fit(comparisonsFrom(lists.values()));
	const elapsed = Math.round(performance.now() - started);

	if (!result.converged) {
		// Worth knowing about: the numbers are usable but not at the fixed point.
		console.warn(
			`warning: stopped at ${result.iterations} iterations without converging`,
		);
	}

	const fittedAt = new Date().toISOString();
	const rows = [...result.strength].map(([movieId, strength]) => ({
		movie_id: movieId,
		strength,
		weight: result.weight.get(movieId) ?? 0,
		raters: raters.get(movieId) ?? 0,
		connected: result.connected.has(movieId),
		fitted_at: fittedAt,
	}));

	for (let at = 0; at < rows.length; at += WRITE_CHUNK) {
		const { error } = await supabase
			.from("global_scores")
			.upsert(rows.slice(at, at + WRITE_CHUNK), { onConflict: "movie_id" });

		if (error) {
			throw new Error(`could not write scores: ${error.message}`);
		}
	}

	// Anything not touched by this run is no longer on any list.
	const { error: staleError, count: removed } = await supabase
		.from("global_scores")
		.delete({ count: "exact" })
		.lt("fitted_at", fittedAt);

	if (staleError) {
		throw new Error(`could not clear stale scores: ${staleError.message}`);
	}

	const publishable = rows.filter(
		(row) => row.connected && row.raters >= MIN_RATERS,
	);

	console.log(
		`fitted ${rows.length} films in ${result.iterations} iterations (${elapsed}ms)`,
	);
	console.log(
		`${publishable.length} with a score, ${rows.length - publishable.length} withheld ` +
			`(fewer than ${MIN_RATERS} lists, or not connected to the pool)`,
	);
	if (removed !== null && removed > 0) {
		console.log(`removed ${removed} films no longer on any list`);
	}

	const top = [...publishable]
		.sort((a, b) => b.strength - a.strength)
		.slice(0, 10);

	if (top.length > 0) {
		const { data: titles } = await supabase
			.from("movies")
			.select("id, title")
			.in(
				"id",
				top.map((row) => row.movie_id),
			);

		const titleOf = new Map(
			(titles ?? []).map((movie) => [movie.id, movie.title]),
		);

		console.log("\ntop of the global list:");
		for (const [position, row] of top.entries()) {
			console.log(
				`${String(position + 1).padStart(3)}. ${(titleOf.get(row.movie_id) ?? row.movie_id).padEnd(44)} ` +
					`strength ${row.strength.toFixed(3)}  ${row.raters} lists`,
			);
		}
	}
}

await main();
