import { isDefined } from "ts-extras";

import { topRatedMovies } from "@/services/tmdb/movie";

import * as movieRepository from "./repository";
import { insertMovieSchema, movieTable } from "./schema";
import { db } from "../db";

const numberFormatter = new Intl.NumberFormat("en-US");

export async function up() {
  let count = 0;

  for await (const movies of topRatedMovies()) {
    const values = movies
      .map((movie) => {
        const result = insertMovieSchema.safeParse({
          tmdbId: movie.id,
          title: movie.title,
          originalTitle: movie.original_title,
          originalLanguage: movie.original_language,
          releaseDate: new Date(movie.release_date),
          posterPath: movie.poster_path,
          popularity: movie.popularity,
        });

        return result.data;
      })
      .filter(isDefined);

    await movieRepository.create(...values);

    count += movies.length;

    console.log(`Inserted ${numberFormatter.format(count)} movies`);
  }
}

export async function down() {
  await db.delete(movieTable);
}
