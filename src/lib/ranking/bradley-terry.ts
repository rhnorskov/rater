/**
 * Batch-fit Bradley–Terry over the pairwise data implied by every user's order.
 *
 * Each film gets one scalar. Scalars are totally ordered, so the global ranking is
 * transitive by construction, and the gaps between them carry magnitude that no single
 * user's ordering contains — see docs/rating-model.md.
 */

export type Comparison = {
	readonly winner: string;
	readonly loser: string;
	readonly weight: number;
};

export type FitOptions = {
	/**
	 * Strength of the neutral prior, in virtual wins and losses against a reference film
	 * of strength 1. Unregularised Bradley–Terry runs to ±∞ for an undefeated or winless
	 * film, so an undefeated obscurity would top the chart on one comparison. This shrinks
	 * toward the population mean instead: it says "we don't know yet", not "we think it is
	 * average".
	 */
	readonly prior?: number;
	readonly maxIterations?: number;
	/** Convergence tolerance on log-strength. */
	readonly tolerance?: number;
};

export type FitResult = {
	/** Log-strength per film, on a scale where the neutral prior sits at 0. */
	readonly strength: Map<string, number>;
	/** Total weight of comparisons each film took part in. */
	readonly weight: Map<string, number>;
	/** Films reachable from the largest comparison component. */
	readonly connected: Set<string>;
	readonly iterations: number;
	readonly converged: boolean;
};

const DEFAULTS = {
	prior: 0.5,
	// MM converges linearly, and strongly separated films need thousands of sweeps.
	maxIterations: 20000,
	// Finer than any displayed score needs, and reached in far fewer sweeps than 1e-9.
	tolerance: 1e-8,
} as const;

/**
 * The pairs one user's order implies, weighted so that influence grows with the number of
 * films ranked rather than with its square.
 *
 * A list of k films yields k(k−1)/2 pairs by transitive closure, so 100 films would carry
 * 110 times the weight of a 10-film list for 10 times the effort, and the global ranking
 * would become the opinion of whoever ranked the most. Weighting each pair 2/(k−1) makes a
 * user's total weight k: linear in what they actually did.
 */
export function* pairsFromOrder(
	orderedIds: readonly string[],
): Generator<Comparison> {
	if (orderedIds.length < 2) {
		return;
	}

	const weight = 2 / (orderedIds.length - 1);

	// Ordered best first, so every earlier film beats every later one.
	for (let i = 0; i < orderedIds.length; i++) {
		for (let j = i + 1; j < orderedIds.length; j++) {
			yield {
				winner: orderedIds[i] as string,
				loser: orderedIds[j] as string,
				weight,
			};
		}
	}
}

type Aggregate = {
	readonly ids: string[];
	readonly index: Map<string, number>;
	/** Weighted wins per film. */
	readonly wins: number[];
	/** Total weight between each unordered pair, keyed by the lower index. */
	readonly between: Map<number, Map<number, number>>;
};

function aggregate(comparisons: Iterable<Comparison>): Aggregate {
	const ids: string[] = [];
	const index = new Map<string, number>();
	const wins: number[] = [];
	const between = new Map<number, Map<number, number>>();

	function idOf(id: string): number {
		const known = index.get(id);
		if (known !== undefined) {
			return known;
		}
		const next = ids.length;
		ids.push(id);
		index.set(id, next);
		wins.push(0);
		return next;
	}

	for (const { winner, loser, weight } of comparisons) {
		if (weight <= 0 || winner === loser) {
			continue;
		}

		const a = idOf(winner);
		const b = idOf(loser);
		wins[a] = (wins[a] ?? 0) + weight;

		const [low, high] = a < b ? [a, b] : [b, a];
		let row = between.get(low);
		if (row === undefined) {
			row = new Map();
			between.set(low, row);
		}
		row.set(high, (row.get(high) ?? 0) + weight);
	}

	return { ids, index, wins, between };
}

/** Films joined by a comparison sit in the same component; the largest one is the pool. */
function largestComponent(data: Aggregate): Set<string> {
	const parent = data.ids.map((_, i) => i);

	function find(i: number): number {
		let root = i;
		while (parent[root] !== root) {
			root = parent[root] as number;
		}
		// Flatten so repeated lookups stay cheap on long chains.
		let walk = i;
		while (parent[walk] !== root) {
			const next = parent[walk] as number;
			parent[walk] = root;
			walk = next;
		}
		return root;
	}

	for (const [low, row] of data.between) {
		for (const high of row.keys()) {
			const a = find(low);
			const b = find(high);
			if (a !== b) {
				parent[a] = b;
			}
		}
	}

	const groups = new Map<number, string[]>();
	for (let i = 0; i < data.ids.length; i++) {
		const root = find(i);
		const group = groups.get(root) ?? [];
		group.push(data.ids[i] as string);
		groups.set(root, group);
	}

	let biggest: string[] = [];
	for (const group of groups.values()) {
		if (group.length > biggest.length) {
			biggest = group;
		}
	}

	return new Set(biggest);
}

/**
 * Fits by minorisation–maximisation, the standard iteration for Bradley–Terry: each sweep
 * is guaranteed not to decrease the likelihood, and with a prior in place the fixed point
 * is unique and finite. Fitted in batch over all data at once, which is what makes the
 * result independent of the order comparisons happened to arrive in.
 *
 * Pair weights are held as flat adjacency arrays rather than a map per film. MM converges
 * linearly and wants hundreds to thousands of sweeps, so the inner loop runs over the whole
 * graph every time; maps make that the bottleneck long before the data gets big.
 *
 * Each sweep reads only the previous sweep's strengths. Updating in place would converge in
 * fewer sweeps, but it would make the answer depend on the order films were first seen,
 * which is exactly the path dependence batch fitting is chosen to avoid.
 */
export function fit(
	comparisons: Iterable<Comparison>,
	options: FitOptions = {},
): FitResult {
	const prior = options.prior ?? DEFAULTS.prior;
	const maxIterations = options.maxIterations ?? DEFAULTS.maxIterations;
	const tolerance = options.tolerance ?? DEFAULTS.tolerance;

	if (prior <= 0) {
		throw new Error("prior must be positive, or the fit can diverge");
	}

	const data = aggregate(comparisons);
	const size = data.ids.length;

	// Symmetric adjacency, compressed: each film's opponents sit in one contiguous run of
	// `neighbours`, with matching weights alongside.
	const degree = new Int32Array(size);
	let edges = 0;
	for (const [low, row] of data.between) {
		for (const high of row.keys()) {
			degree[low] = (degree[low] as number) + 1;
			degree[high] = (degree[high] as number) + 1;
			edges++;
		}
	}

	const offsets = new Int32Array(size + 1);
	for (let i = 0; i < size; i++) {
		offsets[i + 1] = (offsets[i] as number) + (degree[i] as number);
	}

	const neighbours = new Int32Array(edges * 2);
	const pairWeights = new Float64Array(edges * 2);
	const cursor = Int32Array.from(offsets.subarray(0, size));

	for (const [low, row] of data.between) {
		for (const [high, value] of row) {
			const a = cursor[low] as number;
			cursor[low] = a + 1;
			neighbours[a] = high;
			pairWeights[a] = value;

			const b = cursor[high] as number;
			cursor[high] = b + 1;
			neighbours[b] = low;
			pairWeights[b] = value;
		}
	}

	const wins = Float64Array.from(data.wins);
	let strengths = new Float64Array(size).fill(1);
	let next = new Float64Array(size);
	let iterations = 0;
	let converged = size === 0;

	while (iterations < maxIterations && !converged) {
		let shift = 0;

		for (let i = 0; i < size; i++) {
			const own = strengths[i] as number;
			const to = offsets[i + 1] as number;
			let denominator = 0;

			for (let k = offsets[i] as number; k < to; k++) {
				denominator +=
					(pairWeights[k] as number) /
					(own + (strengths[neighbours[k] as number] as number));
			}

			// The virtual opponent sits at strength 1: a win and a loss of size `prior`.
			denominator += (2 * prior) / (own + 1);

			const value = ((wins[i] as number) + prior) / denominator;
			next[i] = value;
			shift = Math.max(shift, Math.abs(Math.log(value / own)));
		}

		// Swap rather than allocate: these arrays are the whole working set.
		const previous = strengths;
		strengths = next;
		next = previous;
		iterations++;
		converged = shift < tolerance;
	}

	const strength = new Map<string, number>();
	const weight = new Map<string, number>();

	for (let i = 0; i < size; i++) {
		strength.set(data.ids[i] as string, Math.log(strengths[i] as number));

		let total = 0;
		for (let k = offsets[i] as number; k < (offsets[i + 1] as number); k++) {
			total += pairWeights[k] as number;
		}
		weight.set(data.ids[i] as string, total);
	}

	return {
		strength,
		weight,
		connected: largestComponent(data),
		iterations,
		converged,
	};
}
