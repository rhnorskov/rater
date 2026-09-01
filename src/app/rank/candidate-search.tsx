"use client";

import { useEffect, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Spinner } from "#/components/ui/spinner";
import { searchMovies } from "./actions";
import { Poster } from "./poster";
import type { Movie } from "./queries";

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

type Props = {
	rankedIds: ReadonlySet<string>;
	listLength: number;
	onPick: (movie: Movie) => void;
};

export function CandidateSearch({ rankedIds, listLength, onPick }: Props) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<Movie[]>([]);
	const [searching, setSearching] = useState(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		if (query.trim().length < MIN_QUERY) {
			setResults([]);
			setSearching(false);
			return;
		}

		let cancelled = false;
		setSearching(true);
		setFailed(false);

		// Typing outruns the round trip, so only the last keystroke of a pause searches.
		const timer = setTimeout(() => {
			searchMovies(query)
				.then((found) => {
					if (!cancelled) {
						setResults(found);
					}
				})
				.catch(() => {
					if (!cancelled) {
						setFailed(true);
						setResults([]);
					}
				})
				.finally(() => {
					if (!cancelled) {
						setSearching(false);
					}
				});
		}, DEBOUNCE_MS);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [query]);

	return (
		<Card className="w-full max-w-2xl">
			<CardHeader>
				<CardTitle>
					{listLength === 0 ? "Rate your first film" : "Add a film"}
				</CardTitle>
				<CardDescription>
					{listLength === 0
						? "The first one goes straight in — there is nothing to compare it against yet."
						: `A handful of comparisons places it among your ${listLength}.`}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<Field>
					<FieldLabel htmlFor="film-search">Search</FieldLabel>
					<Input
						id="film-search"
						value={query}
						autoComplete="off"
						placeholder="Title"
						onChange={(event) => setQuery(event.target.value)}
					/>
				</Field>

				{failed ? (
					<p className="text-destructive text-sm">
						Search failed. Try again in a moment.
					</p>
				) : null}

				{searching ? (
					<p className="flex items-center gap-2 text-muted-foreground text-sm">
						<Spinner /> Searching
					</p>
				) : null}

				{!searching &&
				results.length === 0 &&
				query.trim().length >= MIN_QUERY ? (
					<p className="text-muted-foreground text-sm">No titles match.</p>
				) : null}

				<ul className="divide-y divide-border">
					{results.map((movie) => {
						const ranked = rankedIds.has(movie.id);

						return (
							<li key={movie.id}>
								<button
									type="button"
									disabled={ranked}
									onClick={() => onPick(movie)}
									className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
								>
									<Poster movie={movie} size="sm" />
									<span className="min-w-0 flex-1">
										<span className="block truncate font-medium text-sm">
											{movie.title}
										</span>
										<span className="block text-muted-foreground text-xs">
											{movie.year ?? "Unknown year"}
											{ranked ? " · already on your list" : ""}
										</span>
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			</CardContent>
		</Card>
	);
}
