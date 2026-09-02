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
import { moveRanking, placeMovie } from "./actions";
import { CandidateSearch } from "./candidate-search";
import { Matchup } from "./matchup";
import type { Movie } from "./movie";
import { PlacementReview } from "./placement-review";
import type { RankedMovie } from "./queries";
import { RankedList } from "./ranked-list";
import { SuggestionGame } from "./suggestion-game";

/**
 * One film being placed. The list is captured when the run starts: the answers are
 * relative to that snapshot, so a refresh landing mid-run must not shift the indices
 * underneath them. Nothing is written until the run finishes, and it is only ~log₂(n)
 * comparisons, so a reload losing one costs a few taps rather than needing a table.
 *
 * A film already on the list moves the same way — the only differences are that the
 * snapshot leaves the film out, since it cannot be compared against itself, and that the
 * result rewrites a row instead of adding one.
 */
type Run = {
	readonly kind: "place" | "move";
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

export function RankScreen({ list }: Props) {
	const router = useRouter();
	const [source, setSource] = useState<Source>("game");
	const [run, setRun] = useState<Run | null>(null);
	const [working, setWorking] = useState<string | null>(null);
	const [notice, setNotice] = useState<Notice | null>(null);
	// The film last placed or moved, offered for a second look while it is still fresh.
	const [review, setReview] = useState<Movie | null>(null);
	// Two answers can land before React re-renders — a fast double tap on the last
	// comparison. Both would see the same run and both would write it.
	const committing = useRef(false);

	const rankedIds = new Set(list.map((movie) => movie.id));

	const commit = useCallback(
		async (run: Run, placed: Insertion) => {
			if (committing.current) {
				return;
			}
			committing.current = true;

			const index = placedIndex(placed);
			const boundaries = {
				movieId: run.candidate.id,
				above: run.snapshot[index - 1]?.id ?? null,
				below: run.snapshot[index]?.id ?? null,
			};

			setRun(null);
			setWorking(run.candidate.title);

			const result =
				run.kind === "place"
					? await placeMovie(boundaries)
					: await moveRanking(boundaries);

			setWorking(null);
			committing.current = false;

			if (result.status === "placed" || result.status === "moved") {
				setNotice(null);
				setReview(run.candidate);
			} else if (result.status === "unchanged") {
				setNotice({
					tone: "ok",
					text: `${run.candidate.title} was already in that spot.`,
				});
			} else if (result.status === "stale") {
				setNotice({
					tone: "problem",
					text: `Your list changed while you were comparing, so those answers no longer fit it. Try ${run.candidate.title} again.`,
				});
			} else {
				setNotice({ tone: "problem", text: result.message });
			}

			// The list is server state; the next run needs the version that includes this one.
			router.refresh();
		},
		[router],
	);

	const start = useCallback(
		(candidate: Movie) => {
			const insertion = beginInsertion(list.length);
			setNotice(null);
			setReview(null);

			if (isPlaced(insertion)) {
				// An empty list settles a film with no comparisons at all.
				void commit(
					{ kind: "place", candidate, snapshot: list, insertion },
					insertion,
				);
				return;
			}

			setRun({ kind: "place", candidate, snapshot: list, insertion });
		},
		[commit, list],
	);

	const replace = useCallback(
		(movie: RankedMovie) => {
			const snapshot = list.filter((other) => other.id !== movie.id);
			const insertion = beginInsertion(snapshot.length);
			setNotice(null);
			setReview(null);

			if (isPlaced(insertion)) {
				setNotice({
					tone: "problem",
					text: "There is nothing else on the list to compare it against.",
				});
				return;
			}

			setRun({ kind: "move", candidate: movie, snapshot, insertion });
		},
		[list],
	);

	function answer(candidateIsBetter: boolean) {
		if (run === null || committing.current) {
			return;
		}

		const insertion = narrow(run.insertion, candidateIsBetter);

		if (isPlaced(insertion)) {
			void commit(run, insertion);
			return;
		}

		setRun({ ...run, insertion });
	}

	const index = run === null ? null : comparisonIndex(run.insertion);
	const opponent =
		run === null || index === null ? undefined : run.snapshot[index];
	const busy = working !== null || run !== null;

	return (
		<div className="flex w-full max-w-2xl flex-col gap-6">
			{working !== null ? (
				<Card className="w-full">
					<CardContent className="flex items-center gap-2 text-muted-foreground text-sm">
						<Spinner /> Placing {working}
					</CardContent>
				</Card>
			) : run !== null && index !== null && opponent !== undefined ? (
				<Matchup
					candidate={run.candidate}
					candidateLabel={run.kind === "place" ? "New" : "Moving"}
					opponent={opponent}
					opponentPosition={index + 1}
					listLength={run.snapshot.length}
					remaining={remainingComparisons(run.insertion)}
					onAnswer={answer}
				/>
			) : (
				<div className="flex flex-col gap-3">
					{review === null ? null : (
						<PlacementReview
							movie={review}
							list={list}
							onDismiss={() => setReview(null)}
						/>
					)}

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
			)}

			{/* Kept mounted through a run: comparing a film is easier with the list in view,
			    and a move is hard to judge without it. */}
			<RankedList list={list} onReplace={replace} disabled={busy} />
		</div>
	);
}
