"use client";

import { EyeOff, GitCompareArrows, GripVertical, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
	type KeyboardEvent,
	type PointerEvent,
	useCallback,
	useRef,
	useState,
} from "react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { moveBoundaries } from "#/lib/ranking/insertion";
import { cn } from "#/lib/utils";
import { moveRanking, removeRanking, restoreRanking } from "./actions";
import { Poster } from "./poster";
import type { RankedMovie } from "./queries";

/** A drag in progress. `target` is where the row would land if released now. */
type Drag = {
	readonly index: number;
	readonly target: number;
	readonly startY: number;
	readonly offset: number;
	readonly rowHeight: number;
};

/** A removal that can still be undone, holding the key the film sat on. */
type Undoable = {
	readonly movieId: string;
	readonly title: string;
	readonly rank: string;
};

type Notice = {
	readonly tone: "ok" | "problem";
	readonly text: string;
	readonly undo?: Undoable;
};

type Props = {
	list: readonly RankedMovie[];
	/** Re-place a film by comparison, for moves too long to drag. */
	onReplace: (movie: RankedMovie) => void;
	disabled: boolean;
};

function signatureOf(list: readonly RankedMovie[]): string {
	return list.map((movie) => `${movie.id}:${movie.rank}`).join("|");
}

/** How far a row is displaced while a drag is in flight. */
function shiftFor(drag: Drag | null, index: number): number {
	if (drag === null) {
		return 0;
	}
	if (index === drag.index) {
		return drag.offset;
	}
	// Rows between the row's old and new home slide one place to open the gap.
	if (drag.index < drag.target && index > drag.index && index <= drag.target) {
		return -drag.rowHeight;
	}
	if (drag.target < drag.index && index >= drag.target && index < drag.index) {
		return drag.rowHeight;
	}
	return 0;
}

export function RankedList({ list, onReplace, disabled }: Props) {
	const router = useRouter();
	const [items, setItems] = useState<readonly RankedMovie[]>(list);
	const [syncedTo, setSyncedTo] = useState(() => signatureOf(list));
	const [drag, setDrag] = useState<Drag | null>(null);
	const [notice, setNotice] = useState<Notice | null>(null);
	const listRef = useRef<HTMLOListElement>(null);

	// The list is server state, and a placement elsewhere on the page replaces it. Ranks
	// are part of the signature so a move landing from another tab re-syncs too.
	const signature = signatureOf(list);
	if (signature !== syncedTo) {
		setSyncedTo(signature);
		setItems(list);
		setDrag(null);
	}

	const commitMove = useCallback(
		async (from: number, to: number) => {
			const moved = items[from];

			if (moved === undefined || to === from || to < 0 || to >= items.length) {
				return;
			}

			const { above, below } = moveBoundaries(
				items.map((movie) => movie.id),
				from,
				to,
			);
			const without = items.filter((_, index) => index !== from);

			setItems([...without.slice(0, to), moved, ...without.slice(to)]);
			setNotice(null);

			const result = await moveRanking({ movieId: moved.id, above, below });

			if (result.status === "error") {
				setItems(list);
				setNotice({ tone: "problem", text: result.message });
				return;
			}

			if (result.status === "stale") {
				setItems(list);
				setNotice({
					tone: "problem",
					text: "Your list changed somewhere else, so that move no longer fits it.",
				});
				return;
			}

			// Placed or already there: the order shown is right, but the keys are not.
			router.refresh();
		},
		[items, list, router],
	);

	const remove = useCallback(
		async (movie: RankedMovie) => {
			setItems((previous) => previous.filter((other) => other.id !== movie.id));
			setNotice(null);

			const result = await removeRanking(movie.id);

			if (result.status === "error") {
				setItems(list);
				setNotice({ tone: "problem", text: result.message });
				return;
			}

			setNotice({
				tone: "ok",
				text: `${movie.title} is off your list, and will not be offered again.`,
				undo: { movieId: movie.id, title: movie.title, rank: result.rank },
			});
			router.refresh();
		},
		[list, router],
	);

	const undo = useCallback(
		async (undoable: Undoable) => {
			setNotice(null);
			const result = await restoreRanking({
				movieId: undoable.movieId,
				rank: undoable.rank,
			});

			if (result.status === "error") {
				setNotice({ tone: "problem", text: result.message });
				return;
			}

			router.refresh();
		},
		[router],
	);

	function onPointerDown(
		event: PointerEvent<HTMLButtonElement>,
		index: number,
	) {
		const row = listRef.current?.children[index];

		if (disabled || row === undefined) {
			return;
		}

		// Claims the pointer so the move and release land here even outside the grip.
		event.currentTarget.setPointerCapture(event.pointerId);
		setDrag({
			index,
			target: index,
			startY: event.clientY,
			offset: 0,
			rowHeight: row.getBoundingClientRect().height,
		});
	}

	function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
		if (drag === null) {
			return;
		}

		const offset = event.clientY - drag.startY;
		const steps = Math.round(offset / drag.rowHeight);
		const target = Math.min(Math.max(drag.index + steps, 0), items.length - 1);

		setDrag({ ...drag, offset, target });
	}

	function onPointerUp() {
		if (drag === null) {
			return;
		}

		const { index, target } = drag;
		setDrag(null);
		void commitMove(index, target);
	}

	function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
		if (disabled) {
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			void commitMove(index, index - 1);
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			void commitMove(index, index + 1);
		}
	}

	if (items.length === 0 && notice === null) {
		return null;
	}

	return (
		<Card className="w-full max-w-2xl">
			<CardHeader>
				<CardTitle>Your list</CardTitle>
				<CardDescription>
					{items.length} {items.length === 1 ? "film" : "films"}, best first.
					Drag to nudge one a place or two, compare to move it further, or take
					off one you have not actually seen.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{notice === null ? null : (
					<Alert
						variant={notice.tone === "problem" ? "destructive" : "default"}
					>
						<AlertDescription className="flex flex-wrap items-center gap-2">
							{notice.text}
							{notice.undo === undefined ? null : (
								<Button
									variant="outline"
									size="xs"
									onClick={() => {
										const undoable = notice.undo;
										if (undoable !== undefined) {
											void undo(undoable);
										}
									}}
								>
									<Undo2 data-icon="inline-start" />
									Undo
								</Button>
							)}
						</AlertDescription>
					</Alert>
				)}

				<ol ref={listRef} className="flex flex-col">
					{items.map((movie, index) => (
						<li
							key={movie.id}
							style={{ transform: `translateY(${shiftFor(drag, index)}px)` }}
							className={cn(
								"flex items-center gap-3 border-border border-b py-2 last:border-b-0",
								drag?.index === index
									? "relative z-10 rounded-md bg-card shadow-lg"
									: "transition-transform",
							)}
						>
							<Button
								variant="ghost"
								size="icon-sm"
								disabled={disabled}
								aria-label={`Move ${movie.title}. Drag, or use the arrow keys.`}
								className="touch-none text-muted-foreground"
								onPointerDown={(event) => onPointerDown(event, index)}
								onPointerMove={onPointerMove}
								onPointerUp={onPointerUp}
								onPointerCancel={onPointerUp}
								onKeyDown={(event) => onKeyDown(event, index)}
							>
								<GripVertical />
							</Button>

							<span className="w-6 text-right text-muted-foreground text-xs tabular-nums">
								{index + 1}
							</span>
							<Poster movie={movie} size="sm" />
							<span className="min-w-0 flex-1">
								<span className="block truncate font-medium text-sm">
									{movie.title}
								</span>
								<span className="block text-muted-foreground text-xs">
									{movie.year ?? "Unknown year"}
								</span>
							</span>

							<Button
								variant="ghost"
								size="icon-sm"
								disabled={disabled}
								aria-label={`Compare ${movie.title} again to move it`}
								className="text-muted-foreground"
								onClick={() => onReplace(movie)}
							>
								<GitCompareArrows />
							</Button>

							<Button
								variant="ghost"
								size="icon-sm"
								disabled={disabled}
								aria-label={`Remove ${movie.title} — I have not seen it`}
								className="text-muted-foreground"
								onClick={() => void remove(movie)}
							>
								<EyeOff />
							</Button>
						</li>
					))}
				</ol>
			</CardContent>
		</Card>
	);
}
