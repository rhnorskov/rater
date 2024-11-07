import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { userTable } from "../user/schema";

export const profileTable = pgTable("profile_table", {
  id: uuid("id")
    .notNull()
    .primaryKey()
    .references(() => userTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
