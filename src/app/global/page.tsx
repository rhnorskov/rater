import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { scoreScale } from "#/lib/ranking/score";
import { getGlobalList, MIN_RATERS } from "./queries";

export default async function GlobalPage() {
	const { entries, strengths, withheld, fittedAt } = await getGlobalList();
	const score = scoreScale(strengths);

	return (
		<main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6">
			<Card className="w-full">
				<CardHeader>
					<CardTitle>The global list</CardTitle>
					<CardDescription>
						{entries.length === 0
							? "Nothing has enough agreement behind it yet. Films need to appear on at least two lists before they can be compared across people."
							: `${strengths.length} films have a score, fitted across every list. The gaps come from how often people disagree, so two films close together are genuinely close.${strengths.length > entries.length ? ` Showing the top ${entries.length}.` : ""}`}
					</CardDescription>
				</CardHeader>

				{entries.length === 0 ? null : (
					<CardContent>
						<ol className="flex flex-col">
							{entries.map((entry, index) => (
								<li
									key={entry.id}
									className="flex items-center gap-3 border-border border-b py-2 last:border-b-0"
								>
									<span className="w-6 text-right text-muted-foreground text-xs tabular-nums">
										{index + 1}
									</span>

									<div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-md bg-muted">
										{entry.posterUrl === null ? null : (
											<Image
												src={entry.posterUrl.replace(
													"/t/p/original/",
													"/t/p/w92/",
												)}
												alt=""
												width={32}
												height={48}
												unoptimized
												className="size-full object-cover"
											/>
										)}
									</div>

									<span className="min-w-0 flex-1">
										<span className="block truncate font-medium text-sm">
											{entry.title}
										</span>
										<span className="block text-muted-foreground text-xs">
											{entry.year ?? "Unknown year"} · {entry.raters}{" "}
											{entry.raters === 1 ? "list" : "lists"}
										</span>
									</span>

									<span className="font-medium text-sm tabular-nums">
										{score(entry.strength).toFixed(1)}
									</span>
								</li>
							))}
						</ol>
					</CardContent>
				)}

				<CardFooter className="flex-col items-start gap-1 border-t pt-(--card-spacing)">
					<p className="text-muted-foreground text-xs">
						{withheld === 0
							? "Every fitted film has a score."
							: `${withheld} more ${withheld === 1 ? "film has" : "films have"} been fitted but ${withheld === 1 ? "is" : "are"} not shown: fewer than ${MIN_RATERS} lists, or never compared against the pool. They get no score rather than a guessed one.`}
					</p>
					{fittedAt === null ? null : (
						<p className="text-muted-foreground text-xs">
							Scores are refitted in batch, so they lag your own list. Last run{" "}
							{new Date(fittedAt).toLocaleString("en-GB", {
								dateStyle: "medium",
								timeStyle: "short",
							})}
							.
						</p>
					)}
				</CardFooter>
			</Card>

			<div>
				<Link href="/rank" className={buttonVariants({ variant: "outline" })}>
					Back to ranking
				</Link>
			</div>
		</main>
	);
}
