"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import {
	beginInsertion,
	comparisonIndex,
	type Insertion,
	isPlaced,
	narrow,
	placedIndex,
	remainingComparisons,
} from "#/lib/ranking/insertion";
import { placeMovie } from "./actions";
import { CandidateSearch } from "./candidate-search";
import { Matchup } from "./matchup";
import type { Movie } from "./movie";
import type { RankedMovie } from "./queries";
import { SuggestionGame } from "./suggestion-game";

/**
 * One film being placed. The list is captured when the run starts: the answers are
 * relative to that snapshot, so a refresh landing mid-run must not shift the indices
 * underneath them. Nothing is written until the run finishes, and it is only ~log₂(n)
 * comparisons, so a reload losing one costs a few taps rather than needing a table.
 */
type Run = {
	readonly candidate: Movie;
	readonly snapshot: readonly RankedMovie[];
	readonly insertion: Insertion;
};

type Notice = {
	readonly tone: "ok" | "problem";
	readonly text: string;
};

/** Where candidates come from: offered by the game, or recalled and searched for. */
type Source = "game" | "search";

type Props = {
	list: readonly RankedMovie[];
};

export function ComparisonLoop({ list }: Props) {
	const router = useRouter();
	const [source, setSource] = useState<Source>("game");
	const [run, setRun] = useState<Run | null>(null);
	const [placing, setPlacing] = useState<string | null>(null);
	const [notice, setNotice] = useState<Notice | null>(null);
	// Two answers can land before React re-renders — a fast double tap on the last
	// comparison. Both would see the same run and both would write it.
	const committing = useRef(false);

	const rankedIds = new Set(list.map((movie) => movie.id));

	async function commit(
		candidate: Movie,
		snapshot: readonly RankedMovie[],
		placed: Insertion,
	) {
		if (committing.current) {
			return;
		}
		committing.current = true;

		const index = placedIndex(placed);

		setRun(null);
		setPlacing(candidate.title);

		const result = await placeMovie({
			movieId: candidate.id,
			above: snapshot[index - 1]?.id ?? null,
			below: snapshot[index]?.id ?? null,
		});

		setPlacing(null);
		committing.current = false;

		if (result.status === "placed") {
			setNotice({
				tone: "ok",
				text: `${candidate.title} went in at #${result.position} of ${result.listLength}.`,
			});
		} else if (result.status === "stale") {
			setNotice({
				tone: "problem",
				text: `Your list changed while you were comparing, so those answers no longer fit it. Pick ${candidate.title} again.`,
			});
		} else {
			setNotice({ tone: "problem", text: result.message });
		}

		// The list is server state; the next run needs the version that includes this one.
		router.refresh();
	}

	const start = useCallback(
		(candidate: Movie) => {
			const insertion = beginInsertion(list.length);
			setNotice(null);

			if (isPlaced(insertion)) {
				// An empty list settles a film with no comparisons at all.
				void commit(candidate, list, insertion);
				return;
			}

			setRun({ candidate, snapshot: list, insertion });
		},
		[list],
	);

	function answer(candidateIsBetter: boolean) {
		if (run === null || committing.current) {
			return;
		}

		const insertion = narrow(run.insertion, candidateIsBetter);

		if (isPlaced(insertion)) {
			void commit(run.candidate, run.snapshot, insertion);
			return;
		}

		setRun({ ...run, insertion });
	}

	if (placing !== null) {
		return (
			<Card className="w-full max-w-2xl">
				<CardContent className="flex items-center gap-2 text-muted-foreground text-sm">
					<Spinner /> Placing {placing}
				</CardContent>
			</Card>
		);
	}

	if (run !== null) {
		const index = comparisonIndex(run.insertion);
		const opponent = index === null ? undefined : run.snapshot[index];

		if (index !== null && opponent !== undefined) {
			return (
				<Matchup
					candidate={run.candidate}
					opponent={opponent}
					opponentPosition={index + 1}
					listLength={run.snapshot.length}
					remaining={remainingComparisons(run.insertion)}
					onAnswer={answer}
				/>
			);
		}
	}

	return (
		<div className="flex w-full max-w-2xl flex-col gap-3">
			{notice === null ? null : notice.tone === "ok" ? (
				<p className="text-muted-foreground text-sm">{notice.text}</p>
			) : (
				<Alert variant="destructive">
					<AlertDescription>{notice.text}</AlertDescription>
				</Alert>
			)}

			<div className="flex gap-1">
				<Button
					size="sm"
					variant={source === "game" ? "secondary" : "ghost"}
					aria-pressed={source === "game"}
					onClick={() => setSource("game")}
				>
					Offer me films
				</Button>
				<Button
					size="sm"
					variant={source === "search" ? "secondary" : "ghost"}
					aria-pressed={source === "search"}
					onClick={() => setSource("search")}
				>
					Search
				</Button>
			</div>

			{source === "game" ? (
				<SuggestionGame onPick={start} />
			) : (
				<CandidateSearch
					rankedIds={rankedIds}
					listLength={list.length}
					onPick={start}
				/>
			)}
		</div>
	);
}
