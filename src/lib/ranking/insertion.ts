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
