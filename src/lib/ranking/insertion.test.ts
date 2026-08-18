import { describe, expect, it } from "vitest";
import {
	beginInsertion,
	comparisonIndex,
	type Insertion,
	isPlaced,
	keyForIndex,
	narrow,
	placedIndex,
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
