/**
 * Turns fitted log-strengths into a 1–10 scale for display.
 *
 * Unlike the personal score, this mapping is linear in strength. A single user's ordering
 * is ordinal and carries no spacing, so presenting it needs a shape imposed on it; the
 * global fit does carry magnitude — the gaps come from how often users disagree — and a
 * percentile mapping would throw exactly that away. Two films the population splits 55/45
 * on should look close together, and a runaway favourite should look far ahead.
 *
 * The scale spans the population's actual range rather than clamping a couple of standard
 * deviations out. Clamping ties every film in the top tail at the same number, which is
 * where the ordering matters most, and caps the favourite it is supposed to let run. The
 * cost is that one extreme film compresses the rest, which is acceptable because the prior
 * bounds how far a strength can go.
 *
 * Pass every film that has a score, not just the ones on screen: scaled to a page, the
 * last row always reads 1 and the numbers move as the page size changes.
 *
 * The scale is relative to the population it was built from and shifts as the data grows.
 * That is presentation, not measurement.
 */

const LOWEST = 1;
const HIGHEST = 10;

export function scoreScale(
	strengths: readonly number[],
): (strength: number) => number {
	const middle = (LOWEST + HIGHEST) / 2;

	if (strengths.length === 0) {
		return () => middle;
	}

	let lowest = Number.POSITIVE_INFINITY;
	let highest = Number.NEGATIVE_INFINITY;
	for (const strength of strengths) {
		lowest = Math.min(lowest, strength);
		highest = Math.max(highest, strength);
	}

	const spread = highest - lowest;

	// Every film equal, or only one of them: no spread to spend the scale on.
	if (spread === 0) {
		return () => middle;
	}

	return (strength) => {
		const position = Math.min(Math.max((strength - lowest) / spread, 0), 1);

		return LOWEST + (HIGHEST - LOWEST) * position;
	};
}
