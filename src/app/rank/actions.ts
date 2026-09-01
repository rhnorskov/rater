"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { boundaryIndex, keyForIndex } from "#/lib/ranking/insertion";
import { createClient } from "#/lib/supabase/server";
import { MOVIE_COLUMNS, type Movie, toMovie } from "./movie";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const SEARCH_LIMIT = 24;

// PostgREST reads both % and * as wildcards, and \ as the LIKE escape. Dropping them
// keeps a typed query a literal substring match instead of a pattern.
function literal(query: string): string {
	return query.replace(/[%*_\\]/g, " ").trim();
}

/**
 * Titles matching `query`, most-voted first, for picking the next film to place.
 * Already-ranked films are filtered on the client, which holds the list anyway — an
 * exclusion list in the query would grow with every placement.
 */
export async function searchMovies(query: string): Promise<Movie[]> {
	const pattern = literal(query);

	if (pattern.length < 2) {
		return [];
	}

	const supabase = await createClient();

	const { data, error } = await supabase
		.from("movies")
		.select(MOVIE_COLUMNS)
		.ilike("title", `%${pattern}%`)
		.order("tmdb_vote_count", { ascending: false, nullsFirst: false })
		.limit(SEARCH_LIMIT);

	if (error !== null) {
		throw new Error(`search failed: ${error.message}`);
	}

	return data.map(toMovie);
}

// The game draws from the most-voted end of the catalogue: those are the films a user is
// likeliest to have watched, so fewer offers come back as "haven't seen it".
const POOL = 1000;
const PAGE = 50;
// Every film in a page can be one the user has already dealt with. Redraw rather than
// widen, and give up before the retries cost more than the offer is worth.
const ATTEMPTS = 4;

export type GameStep =
	| { status: "offer"; movie: Movie }
	/** Nothing left in the pool the user has not ranked or waved off. */
	| { status: "exhausted" }
	| { status: "error"; message: string };

/** Films already ranked or already waved off, neither of which may be offered again. */
async function dealtWith(supabase: Supabase): Promise<Set<string>> {
	// RLS scopes both to the signed-in user. Reading the ids whole is fine at the scale of
	// one person's list; past a few thousand this belongs in SQL as a `not exists` on the
	// pool query instead of a set held in memory.
	const [ranked, unseen] = await Promise.all([
		supabase.from("rankings").select("movie_id"),
		supabase.from("unseen").select("movie_id"),
	]);

	if (ranked.error !== null) {
		throw new Error(ranked.error.message);
	}
	if (unseen.error !== null) {
		throw new Error(unseen.error.message);
	}

	return new Set([...ranked.data, ...unseen.data].map((row) => row.movie_id));
}

async function pickCandidate(supabase: Supabase): Promise<Movie | null> {
	const excluded = await dealtWith(supabase);
	let pool = POOL;

	for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
		// Squaring the draw leans on the most-voted end without ever fixing an order, so a
		// long session keeps moving instead of walking the same titles again.
		const offset = Math.floor(pool * Math.random() ** 2);

		const { data, error, count } = await supabase
			.from("movies")
			.select(MOVIE_COLUMNS, { count: "exact" })
			// Vote count alone leaves ties in an undefined order, which paging needs settled.
			.order("tmdb_vote_count", { ascending: false, nullsFirst: false })
			.order("id", { ascending: true })
			.range(offset, offset + PAGE - 1);

		if (error !== null) {
			throw new Error(error.message);
		}

		// A catalogue smaller than the pool would otherwise keep drawing past the end.
		if (count !== null) {
			pool = Math.min(POOL, count);
		}

		const found = data.find((movie) => !excluded.has(movie.id));

		if (found !== undefined) {
			return toMovie(found);
		}
	}

	return null;
}

/** A film to offer, chosen for the user rather than recalled by them. */
export async function nextCandidate(): Promise<GameStep> {
	try {
		const movie = await pickCandidate(await createClient());
		return movie === null
			? { status: "exhausted" }
			: { status: "offer", movie };
	} catch (error) {
		return { status: "error", message: asMessage(error) };
	}
}

/**
 * Records that the user has not watched `movieId` and offers the next film. Persisted
 * rather than held for the session: the point of the game is not being asked again.
 */
export async function markUnseen(movieId: string): Promise<GameStep> {
	const parsed = z.uuid().safeParse(movieId);

	if (!parsed.success) {
		return { status: "error", message: "That film could not be identified." };
	}

	try {
		const supabase = await createClient();
		const { data: claims } = await supabase.auth.getClaims();
		const userId = claims?.claims.sub;

		if (userId === undefined) {
			return {
				status: "error",
				message: "Your session expired. Sign in again.",
			};
		}

		// Waving the same film off twice says nothing new, so a duplicate is not an error.
		const { error } = await supabase
			.from("unseen")
			.upsert(
				{ user_id: userId, movie_id: parsed.data },
				{ onConflict: "user_id,movie_id", ignoreDuplicates: true },
			);

		if (error !== null) {
			return { status: "error", message: error.message };
		}

		const movie = await pickCandidate(supabase);
		return movie === null
			? { status: "exhausted" }
			: { status: "offer", movie };
	} catch (error) {
		return { status: "error", message: asMessage(error) };
	}
}

function asMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Something went wrong.";
}

const placement = z.object({
	movieId: z.uuid(),
	// The films the candidate landed between; null is the top or bottom of the list.
	above: z.uuid().nullable(),
	below: z.uuid().nullable(),
});

export type PlacementInput = z.infer<typeof placement>;

export type PlacementResult =
	| { status: "placed"; position: number; listLength: number }
	/** The list moved under the comparisons; they have to be answered again. */
	| { status: "stale" }
	| { status: "error"; message: string };

export async function placeMovie(
	input: PlacementInput,
): Promise<PlacementResult> {
	const parsed = placement.safeParse(input);

	if (!parsed.success) {
		return { status: "error", message: "That film could not be identified." };
	}

	const supabase = await createClient();
	const { data: claims } = await supabase.auth.getClaims();
	const userId = claims?.claims.sub;

	if (userId === undefined) {
		return { status: "error", message: "Your session expired. Sign in again." };
	}

	const { data: rows, error: readError } = await supabase
		.from("rankings")
		.select("movie_id, rank")
		.order("rank", { ascending: true });

	if (readError !== null) {
		return { status: "error", message: readError.message };
	}

	if (rows.some((row) => row.movie_id === parsed.data.movieId)) {
		return { status: "error", message: "That film is already on your list." };
	}

	const index = boundaryIndex(
		rows.map((row) => row.movie_id),
		parsed.data.above,
		parsed.data.below,
	);

	if (index === null) {
		return { status: "stale" };
	}

	const { error: insertError } = await supabase.from("rankings").insert({
		user_id: userId,
		movie_id: parsed.data.movieId,
		rank: keyForIndex(
			rows.map((row) => row.rank),
			index,
		),
	});

	// 23505 is a unique violation: another insert took this key or this film first.
	// Both mean the list the comparisons ran against is gone.
	if (insertError !== null) {
		return insertError.code === "23505"
			? { status: "stale" }
			: { status: "error", message: insertError.message };
	}

	revalidatePath("/rank");

	return { status: "placed", position: index + 1, listLength: rows.length + 1 };
}
