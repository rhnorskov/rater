import { db } from "../db";

export function findAll() {
  return db.query.ratingTable.findMany();
}
