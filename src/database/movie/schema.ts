import {
  date,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const movieTable = pgTable(
  "movie_table",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    title: text("title").notNull(),
    originalTitle: text("original_title").notNull(),
    originalLanguage: text("original_language").notNull(),
    releaseDate: date("release_date", { mode: "date" }).notNull(),
    posterPath: text("poster_path").notNull(),
    popularity: real("popularity").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return [
      index("tmdb_id_idx").on(table.tmdbId),
      unique("tmdb_id_unique").on(table.tmdbId),
      index("title_idx").on(table.title),
    ];
  },
);

export const insertMovieSchema = createInsertSchema(movieTable);
export const selectMovieSchema = createSelectSchema(movieTable);

export type SelectMovie = typeof movieTable.$inferSelect;
export type InsertMovie = typeof movieTable.$inferInsert;
