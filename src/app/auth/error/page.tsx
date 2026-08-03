import Link from "next/link";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

export default function AuthErrorPage() {
	return (
		<main className="flex flex-1 items-center justify-center p-6">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Link expired</CardTitle>
					<CardDescription>
						That confirmation link is no longer valid. Request a new one by
						signing in again.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button render={<Link href="/auth/signin" />}>Back to sign in</Button>
				</CardContent>
			</Card>
		</main>
	);
}
