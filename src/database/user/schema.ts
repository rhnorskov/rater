import { pgSchema, uuid } from "drizzle-orm/pg-core";

const authSchema = pgSchema("auth");

export const userTable = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});
