"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import { type GameStep, markUnseen, nextCandidate } from "./actions";
import type { Movie } from "./movie";
import { Poster } from "./poster";

type Props = {
	onPick: (movie: Movie) => void;
};

/**
 * Offers films instead of asking the user to recall them. Remembering what you have
 * watched is the slow part — recognising a title you are shown is not — so the pool comes
 * to the user and anything unwatched is waved off in one keystroke.
 */
export function SuggestionGame({ onPick }: Props) {
	const [step, setStep] = useState<GameStep | null>(null);
	const [busy, setBusy] = useState(false);

	const load = useCallback(() => {
		setStep(null);
		nextCandidate()
			.then(setStep)
			.catch(() => {
				setStep({ status: "error", message: "Could not reach the catalogue." });
			});
	}, []);

	useEffect(load, [load]);

	const movie = step?.status === "offer" ? step.movie : null;

	const wave = useCallback(() => {
		if (movie === null || busy) {
			return;
		}

		setBusy(true);
		markUnseen(movie.id)
			.then(setStep)
			.catch(() => {
				setStep({ status: "error", message: "Could not save that." });
			})
			.finally(() => setBusy(false));
	}, [busy, movie]);

	useEffect(() => {
		if (movie === null) {
			return;
		}

		// Narrowing does not follow a captured variable into the handler.
		const offered = movie;

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Enter" || event.key === "y") {
				onPick(offered);
			} else if (event.key === "n" || event.key === "ArrowRight") {
				wave();
			} else {
				return;
			}
			event.preventDefault();
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [movie, onPick, wave]);

	if (step === null) {
		return (
			<Card className="w-full max-w-2xl">
				<CardContent className="flex items-center gap-2 text-muted-foreground text-sm">
					<Spinner /> Finding a film
				</CardContent>
			</Card>
		);
	}

	if (step.status === "exhausted") {
		return (
			<Card className="w-full max-w-2xl">
				<CardHeader>
					<CardTitle>Nothing left to offer</CardTitle>
					<CardDescription>
						Everything in the pool is either on your list or waved off. Search
						for a title instead.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	if (step.status === "error") {
		return (
			<Card className="w-full max-w-2xl">
				<CardHeader>
					<CardTitle>Could not pick a film</CardTitle>
					<CardDescription>{step.message}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button variant="outline" onClick={load}>
						Try again
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-2xl">
			<CardHeader>
				<CardTitle>Have you seen it?</CardTitle>
				<CardDescription>
					Rank the ones you have. Wave off the rest — they will not come back.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex items-center gap-4">
				<Poster movie={step.movie} size="md" />
				<div className="min-w-0 flex-1 space-y-3">
					<div>
						<p className="truncate font-medium">{step.movie.title}</p>
						<p className="text-muted-foreground text-xs">
							{step.movie.year ?? "Unknown year"}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button disabled={busy} onClick={() => onPick(step.movie)}>
							Seen it — rank it
						</Button>
						<Button variant="outline" disabled={busy} onClick={wave}>
							{busy ? <Spinner data-icon="inline-start" /> : null}
							Haven't seen it
						</Button>
						<span className="text-muted-foreground text-xs">enter / n</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
