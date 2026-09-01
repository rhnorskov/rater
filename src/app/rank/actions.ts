"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { boundaryIndex, keyForIndex } from "#/lib/ranking/insertion";
import { createClient } from "#/lib/supabase/server";
import { MOVIE_COLUMNS, type Movie, toMovie } from "./movie";

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

/**
 * How many films to hand the client at once. The draw is one round trip either way, so a
 * batch turns a run of wave-offs from one wait each into one wait per ten.
 */
const BATCH = 10;

export type CandidateBatch =
	/** Empty means the pool is used up: everything is ranked or waved off. */
	{ status: "offers"; movies: Movie[] } | { status: "error"; message: string };

/**
 * Films to offer, chosen for the user rather than recalled by them. The exclusions, the
 * pool size and the pick all happen inside next_candidates, so this is a single request.
 */
export async function nextCandidates(size = BATCH): Promise<CandidateBatch> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase.rpc("next_candidates", {
			sample_size: size,
		});

		if (error !== null) {
			return { status: "error", message: error.message };
		}

		return { status: "offers", movies: data.map(toMovie) };
	} catch (error) {
		return { status: "error", message: asMessage(error) };
	}
}

export type UnseenResult =
	| { status: "ok" }
	| { status: "error"; message: string };

/**
 * Records that the user has not watched `movieId`. Persisted rather than held for the
 * session: the point of the game is not being asked again.
 */
export async function markUnseen(movieId: string): Promise<UnseenResult> {
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

		return error === null
			? { status: "ok" }
			: { status: "error", message: error.message };
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
