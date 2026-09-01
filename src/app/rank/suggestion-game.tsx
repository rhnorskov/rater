"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import { markUnseen, nextCandidates } from "./actions";
import type { Movie } from "./movie";
import { Poster } from "./poster";

/** Refill before the queue runs dry, so the wait never lands on a keystroke. */
const REFILL_AT = 3;

type Props = {
	onPick: (movie: Movie) => void;
};

/**
 * Offers films instead of asking the user to recall them. Remembering what you have
 * watched is the slow part — recognising a title you are shown is not — so the pool comes
 * to the user and anything unwatched is waved off in one keystroke.
 *
 * Offers are queued and answers are optimistic: waving a film off advances immediately and
 * records in the background. A round trip per film is what made this feel slow, and none
 * of them has to be waited on.
 */
export function SuggestionGame({ onPick }: Props) {
	const [queue, setQueue] = useState<Movie[]>([]);
	const [loading, setLoading] = useState(true);
	const [drained, setDrained] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// Films answered in this session. A refill can outrun the writes that exclude them.
	const handled = useRef(new Set<string>());
	const refilling = useRef(false);

	const refill = useCallback(async () => {
		if (refilling.current) {
			return;
		}
		refilling.current = true;

		const batch = await nextCandidates();

		refilling.current = false;
		setLoading(false);

		if (batch.status === "error") {
			setError(batch.message);
			return;
		}

		const fresh = batch.movies.filter(
			(movie) => !handled.current.has(movie.id),
		);
		setDrained(fresh.length === 0);
		setQueue((previous) => {
			const known = new Set(previous.map((movie) => movie.id));
			return [...previous, ...fresh.filter((movie) => !known.has(movie.id))];
		});
	}, []);

	useEffect(() => {
		if (queue.length <= REFILL_AT && !drained && error === null) {
			void refill();
		}
	}, [queue.length, drained, error, refill]);

	const current = queue[0];

	const advance = useCallback((movie: Movie) => {
		handled.current.add(movie.id);
		setQueue((previous) => previous.slice(1));
	}, []);

	const wave = useCallback(() => {
		if (current === undefined) {
			return;
		}

		advance(current);

		// Nothing waits on this: the answer is already reflected and a failure only means
		// the film can come round again.
		void markUnseen(current.id).then((result) => {
			if (result.status === "error") {
				setError(result.message);
			}
		});
	}, [advance, current]);

	const pick = useCallback(() => {
		if (current === undefined) {
			return;
		}
		advance(current);
		onPick(current);
	}, [advance, current, onPick]);

	useEffect(() => {
		if (current === undefined) {
			return;
		}

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Enter" || event.key === "y") {
				pick();
			} else if (event.key === "n" || event.key === "ArrowRight") {
				wave();
			} else {
				return;
			}
			event.preventDefault();
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [current, pick, wave]);

	if (error !== null) {
		return (
			<Card className="w-full max-w-2xl">
				<CardHeader>
					<CardTitle>Could not pick a film</CardTitle>
					<CardDescription>{error}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="outline"
						onClick={() => {
							setError(null);
							setLoading(true);
						}}
					>
						Try again
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (current === undefined) {
		return (
			<Card className="w-full max-w-2xl">
				{loading ? (
					<CardContent className="flex items-center gap-2 text-muted-foreground text-sm">
						<Spinner /> Finding a film
					</CardContent>
				) : (
					<CardHeader>
						<CardTitle>Nothing left to offer</CardTitle>
						<CardDescription>
							Everything in the pool is either on your list or waved off. Search
							for a title instead.
						</CardDescription>
					</CardHeader>
				)}
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
				<Poster movie={current} size="md" />
				<div className="min-w-0 flex-1 space-y-3">
					<div>
						<p className="truncate font-medium">{current.title}</p>
						<p className="text-muted-foreground text-xs">
							{current.year ?? "Unknown year"}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button onClick={pick}>Seen it — rank it</Button>
						<Button variant="outline" onClick={wave}>
							Haven't seen it
						</Button>
						<span className="text-muted-foreground text-xs">enter / n</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
