import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

// Keys are base62 and mixed-case, so the rankings.rank column is declared `collate "C"`.
// Under the database default collation a prepended key sorts to the end of the list.

/** Key ordering strictly between two neighbours; null means the start or end of the list. */
export function keyBetween(
	before: string | null,
	after: string | null,
): string {
	return generateKeyBetween(before, after);
}

/** `count` evenly spaced keys between two neighbours, for inserting a run at once. */
export function keysBetween(
	before: string | null,
	after: string | null,
	count: number,
): string[] {
	return generateNKeysBetween(before, after, count);
}
