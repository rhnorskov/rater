import "server-only";

import { createClient } from "#/lib/supabase/server";

/**
 * A film needs at least this many lists to be given a score. With one rater there is no
 * disagreement to measure, so there is no magnitude — that is a floor, not a tuned number.
 * It should rise as the pool of raters grows; see docs/rating-model.md.
 */
export const MIN_RATERS = 2;

const LIMIT = 100;

export type GlobalEntry = {
	readonly id: string;
	readonly title: string;
	readonly year: number | null;
	readonly posterUrl: string | null;
	readonly strength: number;
	readonly raters: number;
};

export type GlobalList = {
	/** The top of the list, for display. */
	readonly entries: GlobalEntry[];
	/**
	 * Every scored film's strength. The 1–10 scale is built from the whole population, not
	 * from the page, or the last row on screen always reads 1.
	 */
	readonly strengths: number[];
	/** Films fitted but given no score: too few lists, or never compared against the pool. */
	readonly withheld: number;
	readonly fittedAt: string | null;
};

export async function getGlobalList(): Promise<GlobalList> {
	const supabase = await createClient();

	const scored = supabase
		.from("global_scores")
		.select("strength")
		.eq("connected", true)
		.gte("raters", MIN_RATERS);

	const [top, all, fitted] = await Promise.all([
		supabase
			.from("global_scores")
			.select(
				"strength, raters, fitted_at, movies (id, title, release_date, poster_url)",
			)
			.eq("connected", true)
			.gte("raters", MIN_RATERS)
			.order("strength", { ascending: false })
			.limit(LIMIT),
		scored,
		supabase
			.from("global_scores")
			.select("movie_id", { count: "exact", head: true }),
	]);

	if (top.error !== null) {
		throw new Error(`could not load the global list: ${top.error.message}`);
	}
	if (all.error !== null) {
		throw new Error(`could not load the score scale: ${all.error.message}`);
	}

	const entries = top.data.map((row) => ({
		id: row.movies.id,
		title: row.movies.title,
		year:
			row.movies.release_date === null
				? null
				: Number(row.movies.release_date.slice(0, 4)),
		posterUrl: row.movies.poster_url,
		strength: row.strength,
		raters: row.raters,
	}));

	return {
		entries,
		strengths: all.data.map((row) => row.strength),
		// Everything fitted, minus everything that earned a score.
		withheld: Math.max((fitted.count ?? 0) - all.data.length, 0),
		fittedAt: top.data[0]?.fitted_at ?? null,
	};
}
