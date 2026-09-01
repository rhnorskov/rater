"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { boundaryIndex, keyForIndex } from "#/lib/ranking/insertion";
import { createClient } from "#/lib/supabase/server";
import type { Movie } from "./queries";

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
		.select("id, title, release_date, poster_url")
		.ilike("title", `%${pattern}%`)
		.order("tmdb_vote_count", { ascending: false, nullsFirst: false })
		.limit(SEARCH_LIMIT);

	if (error !== null) {
		throw new Error(`search failed: ${error.message}`);
	}

	return data.map((movie) => ({
		id: movie.id,
		title: movie.title,
		year:
			movie.release_date === null
				? null
				: Number(movie.release_date.slice(0, 4)),
		posterUrl: movie.poster_url,
	}));
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
