export type Movie = {
	readonly id: string;
	readonly title: string;
	readonly year: number | null;
	readonly posterUrl: string | null;
};

/** The movies columns every screen here needs. */
export type MovieRow = {
	id: string;
	title: string;
	release_date: string | null;
	poster_url: string | null;
};

export const MOVIE_COLUMNS = "id, title, release_date, poster_url";

export function toMovie(row: MovieRow): Movie {
	const year =
		row.release_date === null ? null : Number(row.release_date.slice(0, 4));

	return {
		id: row.id,
		title: row.title,
		year: year === null || Number.isNaN(year) ? null : year,
		posterUrl: row.poster_url,
	};
}
