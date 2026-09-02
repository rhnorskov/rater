import { describe, expect, it } from "vitest";
import {
	beginInsertion,
	boundaryIndex,
	comparisonIndex,
	type Insertion,
	isPlaced,
	keyForIndex,
	narrow,
	placedIndex,
	remainingComparisons,
} from "./insertion";
import { keysBetween } from "./keys";

/** Places `value` into `sorted` by answering comparisons from the array itself. */
function place(sorted: number[], value: number) {
	let insertion: Insertion = beginInsertion(sorted.length);
	let comparisons = 0;

	while (!isPlaced(insertion)) {
		const index = comparisonIndex(insertion);
		if (index === null) {
			throw new Error("unreachable: not placed but no comparison");
		}
		const other = sorted[index];
		if (other === undefined) {
			throw new Error(`comparison index ${index} out of range`);
		}
		// Lists are ordered best first, so "better" means a higher value.
		insertion = narrow(insertion, value > other);
		comparisons++;
	}

	return { index: placedIndex(insertion), comparisons };
}

describe("beginInsertion", () => {
	it("is immediately placed for an empty list", () => {
		const insertion = beginInsertion(0);
		expect(isPlaced(insertion)).toBe(true);
		expect(comparisonIndex(insertion)).toBeNull();
		expect(placedIndex(insertion)).toBe(0);
	});

	it("rejects a negative length", () => {
		expect(() => beginInsertion(-1)).toThrow();
	});
});

describe("narrow", () => {
	it("throws once the title is placed", () => {
		expect(() => narrow(beginInsertion(0), true)).toThrow();
	});

	it("takes one comparison for a single-item list", () => {
		expect(place([5], 9)).toEqual({ index: 0, comparisons: 1 });
		expect(place([5], 1)).toEqual({ index: 1, comparisons: 1 });
	});
});

describe("placement", () => {
	const sorted = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];

	it("places at the top", () => {
		expect(place(sorted, 200).index).toBe(0);
	});

	it("places at the bottom", () => {
		expect(place(sorted, 1).index).toBe(sorted.length);
	});

	it("agrees with a linear scan for every gap", () => {
		for (const value of [95, 85, 75, 65, 55, 45, 35, 25, 15]) {
			const expected = sorted.findIndex((other) => value > other);
			expect(place(sorted, value).index).toBe(expected);
		}
	});

	it("places ties below the equal item", () => {
		// `value > other` is false for equals, so the new title sorts after it.
		expect(place(sorted, 50).index).toBe(6);
	});

	it("needs at most ceil(log2(n + 1)) comparisons", () => {
		const long = Array.from({ length: 1000 }, (_, i) => 1000 - i);
		const bound = Math.ceil(Math.log2(long.length + 1));
		for (const value of [1500, 750, 500, 250, 0]) {
			expect(place(long, value).comparisons).toBeLessThanOrEqual(bound);
		}
	});
});

describe("keyForIndex", () => {
	it("produces keys that sort into the intended position", () => {
		const keys = keysBetween(null, null, 5);

		for (let index = 0; index <= keys.length; index++) {
			const inserted = keyForIndex(keys, index);
			const expected = [...keys];
			expected.splice(index, 0, inserted);
			expect([...expected].sort()).toEqual(expected);
		}
	});

	it("handles an empty list", () => {
		expect(keyForIndex([], 0)).toBeTypeOf("string");
	});

	it("rejects an out-of-range index", () => {
		expect(() => keyForIndex(["a0"], 2)).toThrow();
		expect(() => keyForIndex(["a0"], -1)).toThrow();
	});

	it("stays ordered across repeated inserts into the same gap", () => {
		let keys = keysBetween(null, null, 2);
		for (let i = 0; i < 50; i++) {
			const inserted = keyForIndex(keys, 1);
			keys = [keys[0] as string, inserted, ...keys.slice(1)];
		}
		expect([...keys].sort()).toEqual(keys);
	});
});

describe("remainingComparisons", () => {
	it("is zero once placed", () => {
		expect(remainingComparisons(beginInsertion(0))).toBe(0);
	});

	it("matches the comparisons placement actually takes", () => {
		const sorted = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
		const budget = remainingComparisons(beginInsertion(sorted.length));

		for (const value of [105, 95, 55, 15, 5]) {
			expect(place(sorted, value).comparisons).toBeLessThanOrEqual(budget);
		}
	});

	it("falls as the range narrows", () => {
		let insertion = beginInsertion(100);
		let previous = remainingComparisons(insertion);

		while (!isPlaced(insertion)) {
			insertion = narrow(insertion, true);
			const remaining = remainingComparisons(insertion);
			expect(remaining).toBeLessThan(previous);
			previous = remaining;
		}
	});
});

describe("boundaryIndex", () => {
	const list = ["a", "b", "c"];

	it("places between two neighbours that still touch", () => {
		expect(boundaryIndex(list, "a", "b")).toBe(1);
		expect(boundaryIndex(list, "b", "c")).toBe(2);
	});

	it("places at the ends", () => {
		expect(boundaryIndex(list, null, "a")).toBe(0);
		expect(boundaryIndex(list, "c", null)).toBe(3);
	});

	it("accepts an empty list", () => {
		expect(boundaryIndex([], null, null)).toBe(0);
	});

	it("agrees with placement for every gap", () => {
		for (let index = 0; index <= list.length; index++) {
			const above = list[index - 1] ?? null;
			const below = list[index] ?? null;
			expect(boundaryIndex(list, above, below)).toBe(index);
		}
	});

	it("rejects a gap something moved into", () => {
		expect(boundaryIndex(["a", "x", "b", "c"], "a", "b")).toBeNull();
	});

	it("rejects a missing neighbour", () => {
		expect(boundaryIndex(list, "gone", "b")).toBeNull();
		expect(boundaryIndex(list, "a", "gone")).toBeNull();
	});

	it("rejects an end that is no longer the end", () => {
		expect(boundaryIndex(list, null, "b")).toBeNull();
		expect(boundaryIndex(list, "b", null)).toBeNull();
	});

	it("tolerates movement outside the gap", () => {
		// Every answer was "worse than b, better than c", which this order still allows.
		expect(boundaryIndex(["b", "c", "a"], "b", "c")).toBe(1);
	});
});

describe("moving a film already on the list", () => {
	/**
	 * What the client sends: the film comes out of the list, and the neighbours either side
	 * of its destination are read from what is left.
	 */
	function boundariesFor(ids: string[], from: number, to: number) {
		const without = ids.filter((_, index) => index !== from);
		return { above: without[to - 1] ?? null, below: without[to] ?? null };
	}

	const ids = ["a", "b", "c", "d", "e"];

	it("resolves back to the position the client asked for", () => {
		for (let from = 0; from < ids.length; from++) {
			for (let to = 0; to < ids.length; to++) {
				const { above, below } = boundariesFor(ids, from, to);
				const without = ids.filter((_, index) => index !== from);

				expect(boundaryIndex(without, above, below)).toBe(to);
			}
		}
	});

	it("puts the film where the client expects it to land", () => {
		for (let from = 0; from < ids.length; from++) {
			for (let to = 0; to < ids.length; to++) {
				const without = ids.filter((_, index) => index !== from);
				const moved = ids[from] as string;
				const reordered = [
					...without.slice(0, to),
					moved,
					...without.slice(to),
				];

				expect(reordered).toHaveLength(ids.length);
				expect(reordered[to]).toBe(moved);
			}
		}
	});

	it("moves the top film to the bottom and back", () => {
		const last = ids.length - 1;
		expect(boundariesFor(ids, 0, last)).toEqual({ above: "e", below: null });
		expect(boundariesFor(ids, last, 0)).toEqual({ above: null, below: "a" });
	});

	it("nudges one place without naming the film itself", () => {
		// b moving up sits between nothing and a; the film is never its own neighbour.
		expect(boundariesFor(ids, 1, 0)).toEqual({ above: null, below: "a" });
		expect(boundariesFor(ids, 1, 2)).toEqual({ above: "c", below: "d" });
	});
});
