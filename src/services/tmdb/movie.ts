import { tmdb } from "./tmdb";

export async function* topRatedMovies() {
  let currentPage = 1;

  while (true) {
    const topRatedMovies = await tmdb.movies.topRated({ page: currentPage });

    if (currentPage >= topRatedMovies.total_pages) {
      break;
    }

    yield topRatedMovies.results;

    currentPage++;
  }
}
