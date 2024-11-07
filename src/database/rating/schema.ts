import { relations } from "drizzle-orm";
import { integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { profileTable } from "../profile/schema";
import { movieTable } from "../schema";

export const ratingTable = pgTable("rating_table", {
  id: uuid("id").defaultRandom().primaryKey(),
  value: integer("value").notNull(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profileTable.id),
  contenderAId: uuid("contender_a_id")
    .notNull()
    .references(() => movieTable.id),
  contenderBId: uuid("contender_b_id")
    .notNull()
    .references(() => movieTable.id),
  winnerId: uuid("winner_id")
    .notNull()
    .references(() => movieTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const ratingRelations = relations(ratingTable, ({ one }) => ({
  profile: one(profileTable, {
    fields: [ratingTable.profileId],
    references: [profileTable.id],
  }),
  contenderA: one(movieTable, {
    fields: [ratingTable.contenderAId],
    references: [movieTable.id],
  }),
  contenderB: one(movieTable, {
    fields: [ratingTable.contenderBId],
    references: [movieTable.id],
  }),
  winnerId: one(movieTable, {
    fields: [ratingTable.winnerId],
    references: [movieTable.id],
  }),
}));
