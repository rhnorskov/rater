import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Poster } from "./poster";
import type { RankedMovie } from "./queries";

type Props = {
	list: readonly RankedMovie[];
};

export function RankedList({ list }: Props) {
	if (list.length === 0) {
		return null;
	}

	return (
		<Card className="w-full max-w-2xl">
			<CardHeader>
				<CardTitle>Your list</CardTitle>
				<CardDescription>
					{list.length} {list.length === 1 ? "film" : "films"}, best first.
					Positions only — a rank this short carries no spacing to turn into a
					score.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ol className="divide-y divide-border">
					{list.map((movie, index) => (
						<li key={movie.id} className="flex items-center gap-3 py-2">
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
						</li>
					))}
				</ol>
			</CardContent>
		</Card>
	);
}
