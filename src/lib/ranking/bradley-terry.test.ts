import { describe, expect, it } from "vitest";
import { type Comparison, fit, pairsFromOrder } from "./bradley-terry";

/** `count` users who all say `winner` beats `loser`. */
function agree(winner: string, loser: string, count: number): Comparison[] {
	return Array.from({ length: count }, () => ({ winner, loser, weight: 1 }));
}

function shuffled<T>(items: readonly T[], seed: number): T[] {
	const copy = [...items];
	let state = seed;
	const random = () => {
		state = (state * 1103515245 + 12345) & 0x7fffffff;
		return state / 0x7fffffff;
	};
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
	}
	return copy;
}

describe("pairsFromOrder", () => {
	it("implies every pair a total order settles", () => {
		expect(
			[...pairsFromOrder(["a", "b", "c"])].map((p) => `${p.winner}>${p.loser}`),
		).toEqual(["a>b", "a>c", "b>c"]);
	});

	it("yields nothing for a list too short to compare", () => {
		expect([...pairsFromOrder([])]).toEqual([]);
		expect([...pairsFromOrder(["a"])]).toEqual([]);
	});

	it("gives a user total weight equal to the films they ranked", () => {
		// The whole point of the weighting: linear in effort, not quadratic.
		for (const size of [2, 5, 10, 100, 500]) {
			const ids = Array.from({ length: size }, (_, i) => `f${i}`);
			const total = [...pairsFromOrder(ids)].reduce(
				(sum, p) => sum + p.weight,
				0,
			);

			expect(total).toBeCloseTo(size, 6);
		}
	});

	it("keeps a long list from swamping a short one", () => {
		// 100 films against 10: 110x the pairs, but only 10x the weight.
		const long = [
			...pairsFromOrder(Array.from({ length: 100 }, (_, i) => `l${i}`)),
		];
		const short = [
			...pairsFromOrder(Array.from({ length: 10 }, (_, i) => `s${i}`)),
		];

		expect(long.length / short.length).toBeCloseTo(110, 0);

		const weightOf = (ps: Comparison[]) => ps.reduce((s, p) => s + p.weight, 0);
		expect(weightOf(long) / weightOf(short)).toBeCloseTo(10, 6);
	});
});

describe("fit", () => {
	it("orders films the way the comparisons do", () => {
		const result = fit([
			...agree("a", "b", 10),
			...agree("b", "c", 10),
			...agree("a", "c", 10),
		]);

		const a = result.strength.get("a") ?? 0;
		const b = result.strength.get("b") ?? 0;
		const c = result.strength.get("c") ?? 0;

		expect(a).toBeGreaterThan(b);
		expect(b).toBeGreaterThan(c);
		expect(result.converged).toBe(true);
	});

	it("infers a pair that was never compared", () => {
		// Nothing links a to c directly. The scalar has to place them anyway.
		const result = fit([...agree("a", "b", 20), ...agree("b", "c", 20)]);

		expect(result.strength.get("a") ?? 0).toBeGreaterThan(
			result.strength.get("c") ?? 0,
		);
	});

	it("recovers magnitude from how much users disagree", () => {
		// Near-unanimous against a coin flip: the gap is what carries "much better".
		const result = fit([
			...agree("sure", "sureLoser", 98),
			...agree("sureLoser", "sure", 2),
			...agree("close", "closeLoser", 55),
			...agree("closeLoser", "close", 45),
		]);

		const decisive =
			(result.strength.get("sure") ?? 0) -
			(result.strength.get("sureLoser") ?? 0);
		const narrow =
			(result.strength.get("close") ?? 0) -
			(result.strength.get("closeLoser") ?? 0);

		expect(decisive).toBeGreaterThan(narrow);
		// A 55/45 split is barely a preference at all.
		expect(narrow).toBeLessThan(0.5);
	});

	it("does not let an undefeated film run away", () => {
		// One comparison, never beaten. Unregularised this diverges to infinity.
		const result = fit([...agree("obscurity", "known", 1)]);
		const obscurity = result.strength.get("obscurity") ?? 0;

		expect(Number.isFinite(obscurity)).toBe(true);
		expect(obscurity).toBeLessThan(1);

		// Something proven over many comparisons should outrank it.
		const proven = fit([
			...agree("obscurity", "known", 1),
			...agree("proven", "alsoKnown", 200),
			...agree("alsoKnown", "proven", 4),
		]);

		expect(proven.strength.get("proven") ?? 0).toBeGreaterThan(
			proven.strength.get("obscurity") ?? 0,
		);
	});

	it("shrinks toward the prior rather than toward a borrowed average", () => {
		// A film with no comparisons at all is not "average", it is unknown: it sits exactly
		// at the reference the prior defines.
		const result = fit([
			...agree("a", "b", 5),
			{ winner: "c", loser: "c", weight: 1 },
		]);

		expect(result.strength.has("c")).toBe(false);
	});

	it("is independent of the order comparisons arrive in", () => {
		// The objection to Elo is path dependence. Batch fitting has none, and this is the
		// property that makes the global ranking reproducible.
		const comparisons = [
			...agree("a", "b", 7),
			...agree("b", "c", 5),
			...agree("c", "a", 2),
			...agree("b", "d", 9),
			...agree("d", "a", 1),
		];

		const baseline = fit(comparisons);

		for (const seed of [1, 2, 3, 99]) {
			const other = fit(shuffled(comparisons, seed));

			for (const [id, value] of baseline.strength) {
				expect(other.strength.get(id) ?? Number.NaN).toBeCloseTo(value, 9);
			}
		}
	});

	it("reports only the films connected to the main pool", () => {
		const result = fit([
			...agree("a", "b", 3),
			...agree("b", "c", 3),
			// An island: these two were only ever compared against each other.
			...agree("x", "y", 3),
		]);

		expect([...result.connected].sort()).toEqual(["a", "b", "c"]);
		// Islands are still fitted; whether to publish them is a separate decision.
		expect(result.strength.has("x")).toBe(true);
	});

	it("counts the weight behind each film", () => {
		const result = fit([...pairsFromOrder(["a", "b", "c"])]);

		// Each film is in 2 of the 3 pairs, each weighted 2/(3-1) = 1.
		expect(result.weight.get("a") ?? 0).toBeCloseTo(2, 6);
		expect(result.weight.get("b") ?? 0).toBeCloseTo(2, 6);
	});

	it("handles no data at all", () => {
		const result = fit([]);

		expect(result.strength.size).toBe(0);
		expect(result.converged).toBe(true);
	});

	it("refuses a prior that would let the fit diverge", () => {
		expect(() => fit([...agree("a", "b", 1)], { prior: 0 })).toThrow();
	});

	it("agrees with two users' orders combined", () => {
		// One user ranks a,b,c; another ranks a,c,b. a is unanimous, b and c are contested.
		const result = fit([
			...pairsFromOrder(["a", "b", "c"]),
			...pairsFromOrder(["a", "c", "b"]),
		]);

		const a = result.strength.get("a") ?? 0;
		const b = result.strength.get("b") ?? 0;
		const c = result.strength.get("c") ?? 0;

		expect(a).toBeGreaterThan(b);
		expect(a).toBeGreaterThan(c);
		// Tied evidence, so the two contested films should land together.
		expect(Math.abs(b - c)).toBeLessThan(1e-6);
	});
});
