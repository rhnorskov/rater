"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import { moveBoundaries } from "#/lib/ranking/insertion";
import { moveRanking } from "./actions";
import type { Movie } from "./movie";
import type { RankedMovie } from "./queries";

type Props = {
	/** The film just placed or moved. */
	movie: Movie;
	list: readonly RankedMovie[];
	onDismiss: () => void;
};

/**
 * Offers a nudge straight after a placement, while the judgement is still fresh.
 *
 * A placement is exact against the two films it landed between, but those two were
 * ordered by earlier answers that may themselves be wrong — see docs/rating-model.md. That
 * kind of error is invisible later, because the placement that caused it felt right at the
 * time. Showing the neighbours now is the only moment the user can recognise it.
 */
export function PlacementReview({ movie, list, onDismiss }: Props) {
	const router = useRouter();
	const [moving, setMoving] = useState(false);

	const index = list.findIndex((other) => other.id === movie.id);

	async function nudge(to: number) {
		if (index === -1 || moving) {
			return;
		}

		setMoving(true);
		const { above, below } = moveBoundaries(
			list.map((other) => other.id),
			index,
			to,
		);
		await moveRanking({ movieId: movie.id, above, below });
		setMoving(false);
		router.refresh();
	}

	// Until the refreshed list arrives the film has no neighbours to show, and a one-film
	// list has none to offer.
	if (index === -1 || list.length < 2) {
		return null;
	}

	const above = list[index - 1];
	const below = list[index + 1];

	return (
		<Card size="sm" className="w-full">
			<CardContent className="flex flex-col gap-2">
				<p className="text-muted-foreground text-xs">
					{movie.title} sits at #{index + 1}. Right place?
				</p>

				<ol className="flex flex-col text-sm">
					{above === undefined ? null : (
						<Neighbour position={index} title={above.title} />
					)}

					<li className="flex items-center gap-2 py-1 font-medium">
						<span className="w-6 text-right text-muted-foreground text-xs tabular-nums">
							{index + 1}
						</span>
						<span className="min-w-0 flex-1 truncate">{movie.title}</span>
						{moving ? <Spinner /> : null}
						<Button
							variant="outline"
							size="icon-xs"
							disabled={moving || index === 0}
							aria-label={`Move ${movie.title} above ${above?.title ?? "the top"}`}
							onClick={() => void nudge(index - 1)}
						>
							<ChevronUp />
						</Button>
						<Button
							variant="outline"
							size="icon-xs"
							disabled={moving || index === list.length - 1}
							aria-label={`Move ${movie.title} below ${below?.title ?? "the bottom"}`}
							onClick={() => void nudge(index + 1)}
						>
							<ChevronDown />
						</Button>
					</li>

					{below === undefined ? null : (
						<Neighbour position={index + 2} title={below.title} />
					)}
				</ol>

				<div>
					<Button variant="ghost" size="xs" onClick={onDismiss}>
						Looks right
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function Neighbour({ position, title }: { position: number; title: string }) {
	return (
		<li className="flex items-center gap-2 py-1 text-muted-foreground">
			<span className="w-6 text-right text-xs tabular-nums">{position}</span>
			<span className="min-w-0 flex-1 truncate">{title}</span>
		</li>
	);
}
