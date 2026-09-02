import { keyBetween } from "./keys";

/**
 * Progress of placing one title into a list ordered best first. `low` and `high` bound
 * the range of positions the title could still occupy; they meet when it is placed.
 */
export type Insertion = {
	readonly low: number;
	readonly high: number;
};

export function beginInsertion(listLength: number): Insertion {
	if (listLength < 0) {
		throw new Error(`list length cannot be negative: ${listLength}`);
	}
	return { low: 0, high: listLength };
}

export function isPlaced(insertion: Insertion): boolean {
	return insertion.low >= insertion.high;
}

/** Index in the existing list to compare against, or null once the title is placed. */
export function comparisonIndex(insertion: Insertion): number | null {
	if (isPlaced(insertion)) {
		return null;
	}
	return Math.floor((insertion.low + insertion.high) / 2);
}

/**
 * Comparisons still needed in the worst case. Shown to the user, so it counts the
 * remaining candidate positions rather than the items left to compare against.
 */
export function remainingComparisons(insertion: Insertion): number {
	if (isPlaced(insertion)) {
		return 0;
	}
	return Math.ceil(Math.log2(insertion.high - insertion.low + 1));
}

/** Halves the remaining range using the answer to the comparison at `comparisonIndex`. */
export function narrow(
	insertion: Insertion,
	candidateIsBetter: boolean,
): Insertion {
	const index = comparisonIndex(insertion);
	if (index === null) {
		throw new Error("cannot narrow an insertion that is already placed");
	}
	return candidateIsBetter
		? { low: insertion.low, high: index }
		: { low: index + 1, high: insertion.high };
}

/** Final position, counted from the best end of the list. */
export function placedIndex(insertion: Insertion): number {
	if (!isPlaced(insertion)) {
		throw new Error("insertion is not placed yet");
	}
	return insertion.low;
}

/**
 * Rank key for a title landing at `index`, given the existing keys in list order.
 * The neighbours either side determine the key, so the rest of the list is untouched.
 */
export function keyForIndex(orderedKeys: string[], index: number): string {
	if (index < 0 || index > orderedKeys.length) {
		throw new Error(
			`index ${index} is outside a list of ${orderedKeys.length}`,
		);
	}
	return keyBetween(orderedKeys[index - 1] ?? null, orderedKeys[index] ?? null);
}

/**
 * Where a title bounded by `above` and `below` belongs in `orderedIds`, or null if those
 * two no longer touch. Nulls stand for the ends of the list.
 *
 * Comparisons run against a snapshot the client holds, so the list can move underneath
 * them. Adjacency is the exact condition for the answers to still hold: every one of them
 * said "worse than `above`, better than `below`", and nothing else was decided. A gap that
 * closed means some item now claims the position the user chose, and the insertion has to
 * be replayed against the current list.
 */
export function boundaryIndex(
	orderedIds: readonly string[],
	above: string | null,
	below: string | null,
): number | null {
	const index = above === null ? 0 : orderedIds.indexOf(above) + 1;

	// indexOf missed, so the item the title was placed under is gone.
	if (above !== null && index === 0) {
		return null;
	}
	if ((orderedIds[index] ?? null) !== below) {
		return null;
	}
	return index;
}

/**
 * The neighbours a film at `from` would sit between if it moved to `to`, as indices into
 * the list. The film comes out first: it cannot be its own neighbour, and every position
 * after it shifts up by one once it is gone.
 *
 * Both ends of a move are computed here so the client and the server agree on what a
 * position means — see `boundaryIndex`, which resolves these back.
 */
export function moveBoundaries(
	orderedIds: readonly string[],
	from: number,
	to: number,
): { above: string | null; below: string | null } {
	const without = orderedIds.filter((_, index) => index !== from);

	return { above: without[to - 1] ?? null, below: without[to] ?? null };
}
