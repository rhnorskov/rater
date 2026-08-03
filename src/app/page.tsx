import { Button } from "#/components/ui/button";
import { createClient } from "#/lib/supabase/server";
import { signOut } from "./auth/actions";

export default async function HomePage() {
	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();

	return (
		<main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
			<p className="text-muted-foreground text-sm">
				Signed in as {data?.claims.email}
			</p>
			<form action={signOut}>
				<Button type="submit" variant="outline">
					Sign out
				</Button>
			</form>
		</main>
	);
}
