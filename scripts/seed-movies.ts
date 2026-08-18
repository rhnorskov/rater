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
	vote_count: z.number().nullish(),
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
		tmdb_vote_count: movie.vote_count ?? null,
		synced_at: new Date().toISOString(),
	};
}

async function fetchPage(page: number) {
	const url = new URL("https://api.themoviedb.org/3/discover/movie");
	// vote_count.desc is strictly monotonic across pages; popularity.desc is not.
	url.searchParams.set("sort_by", "vote_count.desc");
	url.searchParams.set("include_adult", "false");
	url.searchParams.set("page", String(page));

	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${env.TMDB_ACCESS_TOKEN}` },
	});

	if (!response.ok) {
		throw new Error(`TMDB ${response.status} on page ${page}`);
	}

	return discoverPage.parse(await response.json());
}

async function main() {
	const minVotes = Number(process.argv[2] ?? 50);
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

		const wanted = results.filter(
			(movie) => (movie.vote_count ?? 0) >= minVotes,
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

	console.log(`done: ${upserted} rows at vote_count >= ${minVotes}`);

	if (!reachedThreshold) {
		console.log(
			`note: stopped at TMDB's ${MAX_PAGE}-page cap (${MAX_PAGE * PAGE_SIZE} titles) before reaching vote_count ${minVotes}. Paging cannot go deeper; a fuller catalogue needs the daily ID export.`,
		);
	}
}

await main();
