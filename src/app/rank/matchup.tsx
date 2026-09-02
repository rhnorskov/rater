"use client";

import { useEffect } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "#/components/ui/card";
import { cn } from "#/lib/utils";
import type { Movie } from "./movie";
import { Poster } from "./poster";
import type { RankedMovie } from "./queries";

type Props = {
	candidate: Movie;
	/** What the candidate is: newly arriving, or already on the list and moving. */
	candidateLabel: string;
	opponent: RankedMovie;
	/** 1-based position of the opponent, so the user can see where they are probing. */
	opponentPosition: number;
	listLength: number;
	remaining: number;
	onAnswer: (candidateIsBetter: boolean) => void;
};

export function Matchup({
	candidate,
	candidateLabel,
	opponent,
	opponentPosition,
	listLength,
	remaining,
	onAnswer,
}: Props) {
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "ArrowLeft") {
				onAnswer(true);
			} else if (event.key === "ArrowRight") {
				onAnswer(false);
			} else {
				return;
			}
			event.preventDefault();
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onAnswer]);

	return (
		<Card className="w-full max-w-2xl">
			<CardHeader>
				<CardDescription>
					Which is better? {remaining} {remaining === 1 ? "answer" : "answers"}{" "}
					left — probing #{opponentPosition} of {listLength}.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid grid-cols-2 gap-3">
				{/* The candidate stays on the left for every comparison in a run. A fixed
				    side invites position bias, but a moving one costs more than it saves:
				    the film being placed is the one the user has to keep in mind. */}
				<Choice
					movie={candidate}
					label={candidateLabel}
					hint="←"
					onSelect={() => onAnswer(true)}
				/>
				<Choice
					movie={opponent}
					label={`#${opponentPosition}`}
					hint="→"
					onSelect={() => onAnswer(false)}
				/>
			</CardContent>
		</Card>
	);
}

type ChoiceProps = {
	movie: Movie;
	label: string;
	hint: string;
	onSelect: () => void;
};

function Choice({ movie, label, hint, onSelect }: ChoiceProps) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"flex flex-col items-center gap-3 rounded-lg p-3 text-center transition-colors",
				"hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
			)}
		>
			<Poster movie={movie} size="lg" />
			<div className="space-y-0.5">
				<p className="font-medium text-sm">{movie.title}</p>
				<p className="text-muted-foreground text-xs">
					{movie.year ?? "—"} · {label} · {hint}
				</p>
			</div>
		</button>
	);
}
