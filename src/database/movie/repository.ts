import { InsertMovie, movieTable } from "./schema";
import { db } from "../db";

export async function findByTitle(title: string) {
  return db.query.movieTable.findMany({
    limit: 10,
    where: (movie, { ilike }) => ilike(movie.title, `%${title}%`),
  });
}

export async function findRandom(limit: number) {
  return db.query.movieTable.findMany({
    limit,
    orderBy: (_, { asc, sql }) => [asc(sql`RANDOM()`)],
  });
}

export async function findPopular(limit: number) {
  return db.query.movieTable.findMany({
    limit,
    orderBy: (movie, { desc }) => [desc(movie.popularity)],
  });
}

export async function create(...values: InsertMovie[]) {
  return db
    .insert(movieTable)
    .values(values)
    .onConflictDoNothing({ target: movieTable.tmdbId })
    .execute();
}
