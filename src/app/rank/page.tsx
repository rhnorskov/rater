import { getRankedList } from "./queries";
import { RankScreen } from "./rank-screen";

export default async function RankPage() {
	const list = await getRankedList();

	return (
		<main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center p-6">
			<RankScreen list={list} />
		</main>
	);
}
