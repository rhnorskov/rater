import "server-only";

import { createClient } from "#/lib/supabase/server";

export type Movie = {
	readonly id: string;
	readonly title: string;
	readonly year: number | null;
	readonly posterUrl: string | null;
};

export type RankedMovie = Movie & { readonly rank: string };

function year(releaseDate: string | null): number | null {
	if (releaseDate === null) {
		return null;
	}
	const parsed = Number(releaseDate.slice(0, 4));
	return Number.isNaN(parsed) ? null : parsed;
}

/**
 * The signed-in user's list, best first. RLS narrows this to their own rows, and the
 * rank column carries collate "C", so the database sorts keys the way the client
 * generated them.
 */
export async function getRankedList(): Promise<RankedMovie[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("rankings")
		.select("rank, movies (id, title, release_date, poster_url)")
		.order("rank", { ascending: true });

	if (error !== null) {
		throw new Error(`could not load the ranked list: ${error.message}`);
	}

	return data.map((row) => ({
		id: row.movies.id,
		title: row.movies.title,
		year: year(row.movies.release_date),
		posterUrl: row.movies.poster_url,
		rank: row.rank,
	}));
}
