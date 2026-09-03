import { describe, expect, it } from "vitest";
import { scoreScale } from "./score";

describe("scoreScale", () => {
	it("spans the population's range", () => {
		const score = scoreScale([-2, 0, 3]);

		expect(score(-2)).toBeCloseTo(1, 6);
		expect(score(3)).toBeCloseTo(10, 6);
	});

	it("orders films the way their strengths do", () => {
		const strengths = [-2, -0.5, 0, 0.75, 3];
		const score = scoreScale(strengths);
		const scored = strengths.map(score);

		for (let i = 1; i < scored.length; i++) {
			expect(scored[i] as number).toBeGreaterThan(scored[i - 1] as number);
		}
	});

	it("keeps gaps proportional, which is the point of having magnitude", () => {
		// Two films nearly tied and one far ahead. A percentile mapping would space all
		// three equally and throw the difference away.
		const strengths = [0, 0.05, 2];
		const score = scoreScale(strengths);

		const tied = (score(0.05) as number) - (score(0) as number);
		const ahead = (score(2) as number) - (score(0.05) as number);

		expect(ahead / tied).toBeCloseTo((2 - 0.05) / 0.05, 3);
	});

	it("does not tie the films at the top", () => {
		// The clamped version gave every film past two deviations the same 10.0, losing the
		// ordering exactly where people look.
		const strengths = [-1, 0, 0.5, 2.2, 2.6, 3.4];
		const score = scoreScale(strengths);
		const top = [2.2, 2.6, 3.4].map(score);

		expect(new Set(top.map((value) => value.toFixed(1))).size).toBe(3);
	});

	it("lets a runaway favourite look far ahead", () => {
		const score = scoreScale([0, 0.1, 0.2, 0.3, 5]);

		expect(score(5) - score(0.3)).toBeGreaterThan(score(0.3) - score(0));
	});

	it("stays inside the scale", () => {
		const strengths = [-3, -1, 0, 0.2, 5];
		const score = scoreScale(strengths);

		for (const strength of [-50, -3, 0, 5, 50]) {
			expect(score(strength)).toBeGreaterThanOrEqual(1);
			expect(score(strength)).toBeLessThanOrEqual(10);
		}
	});

	it("handles a population with nothing to separate", () => {
		expect(scoreScale([])(0)).toBe(5.5);
		expect(scoreScale([1.5])(1.5)).toBe(5.5);
		expect(scoreScale([2, 2, 2])(2)).toBe(5.5);
	});
});
