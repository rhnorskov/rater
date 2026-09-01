import "server-only";

import { createClient } from "#/lib/supabase/server";
import { type Movie, toMovie } from "./movie";

export type RankedMovie = Movie & { readonly rank: string };

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

	return data.map((row) => ({ ...toMovie(row.movies), rank: row.rank }));
}
