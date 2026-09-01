import { ComparisonLoop } from "./comparison-loop";
import { getRankedList } from "./queries";
import { RankedList } from "./ranked-list";

export default async function RankPage() {
	const list = await getRankedList();

	return (
		<main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-6 p-6">
			<ComparisonLoop list={list} />
			<RankedList list={list} />
		</main>
	);
}
