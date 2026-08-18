import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const IMAGE_BASE = "https://image.tmdb.org/t/p/original";
const PAGE_SIZE = 20;
// TMDB refuses page numbers above 500 regardless of result count.
const MAX_PAGE = 500;

const env = z
	.object({
		TMDB_ACCESS_TOKEN: z.string().min(1),
		NEXT_PUBLIC_SUPABASE_URL: z.url(),
		SUPABASE_SECRET_KEY: z.string().min(1),
	})
	.parse(process.env);

const discoverResult = z.object({
	id: z.number(),
	title: z.string(),
	original_title: z.string().nullish(),
	release_date: z.string().nullish(),
	overview: z.string().nullish(),
	poster_path: z.string().nullish(),
	backdrop_path: z.string().nullish(),
	popularity: z.number().nullish(),
});

const discoverPage = z.object({
	results: z.array(discoverResult),
	total_pages: z.number(),
});

type DiscoverResult = z.infer<typeof discoverResult>;

function imageUrl(path: string | null | undefined): string | null {
	return path == null || path === "" ? null : `${IMAGE_BASE}${path}`;
}

// TMDB sends "" for unknown dates, which Postgres rejects as a date.
function nullIfBlank(value: string | null | undefined): string | null {
	return value == null || value.trim() === "" ? null : value;
}

function toRow(movie: DiscoverResult) {
	return {
		tmdb_id: movie.id,
		title: movie.title,
		original_title: nullIfBlank(movie.original_title),
		release_date: nullIfBlank(movie.release_date),
		overview: nullIfBlank(movie.overview),
		poster_url: imageUrl(movie.poster_path),
		backdrop_url: imageUrl(movie.backdrop_path),
		tmdb_popularity: movie.popularity ?? null,
		synced_at: new Date().toISOString(),
	};
}

async function fetchPage(page: number) {
	const url = new URL("https://api.themoviedb.org/3/discover/movie");
	url.searchParams.set("sort_by", "popularity.desc");
	url.searchParams.set("include_adult", "false");
	url.searchParams.set("page", String(page));
	// Drops entries with no votes at all. Unlike popularity.gte, TMDB honours this one.
	url.searchParams.set("vote_count.gte", "1");

	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${env.TMDB_ACCESS_TOKEN}` },
	});

	if (!response.ok) {
		throw new Error(`TMDB ${response.status} on page ${page}`);
	}

	return discoverPage.parse(await response.json());
}

async function main() {
	const minPopularity = Number(process.argv[2] ?? 5);
	const supabase = createClient(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.SUPABASE_SECRET_KEY,
		{ auth: { persistSession: false, autoRefreshToken: false } },
	);

	let page = 1;
	let upserted = 0;
	let reachedThreshold = false;

	while (page <= MAX_PAGE) {
		const { results } = await fetchPage(page);

		if (results.length === 0) {
			break;
		}

		// popularity.desc is only approximately sorted — individual pages carry outliers
		// well below their neighbours — so keep paging until a whole page is under the
		// threshold rather than stopping at the first item that is.
		const wanted = results.filter(
			(movie) => (movie.popularity ?? 0) >= minPopularity,
		);
		reachedThreshold = wanted.length === 0;

		if (wanted.length > 0) {
			const { error } = await supabase
				.from("movies")
				.upsert(wanted.map(toRow), { onConflict: "tmdb_id" });

			if (error) {
				throw new Error(`upsert failed on page ${page}: ${error.message}`);
			}

			upserted += wanted.length;
		}

		if (reachedThreshold) {
			break;
		}

		if (page % 25 === 0 || page === 1) {
			console.log(`page ${page} — ${upserted} rows`);
		}
		page++;
	}

	console.log(`done: ${upserted} rows at popularity >= ${minPopularity}`);

	if (!reachedThreshold) {
		console.log(
			`note: stopped at TMDB's ${MAX_PAGE}-page cap (${MAX_PAGE * PAGE_SIZE} titles) before reaching popularity ${minPopularity}. Raise the threshold to cover the catalogue.`,
		);
	}
}

await main();
