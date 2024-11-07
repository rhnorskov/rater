export async function up() {
  console.log("up");
}

export async function down() {
  console.log("down");
}

// import { faker } from "@faker-js/faker";

// import { db } from "./db";
// import { ratingTable } from "./schema";

// console.log("Seeding database...");

// await db.insert(ratingTable).values(
//   Array.from({ length: 100 }, () => ({
//     value: faker.number.int({
//       min: 1,
//       max: 10,
//     }),
//   }))
// );

// console.log("Database seeded.");
