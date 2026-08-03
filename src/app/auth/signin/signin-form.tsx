"use client";

import { useActionState } from "react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Spinner } from "#/components/ui/spinner";
import { type SignInState, signIn } from "./actions";

const initialState: SignInState = {};

export function SignInForm() {
	const [state, formAction, pending] = useActionState(signIn, initialState);

	if (state.sentTo !== undefined) {
		return (
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Check your email</CardTitle>
					<CardDescription>
						We sent a sign-in link to {state.sentTo}. It expires shortly.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle>Sign in</CardTitle>
				<CardDescription>
					We'll email you a link. No password needed.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form action={formAction}>
					<FieldGroup>
						{state.message === undefined ? null : (
							<Alert variant="destructive">
								<AlertTitle>Could not send the link</AlertTitle>
								<AlertDescription>{state.message}</AlertDescription>
							</Alert>
						)}

						<Field data-invalid={state.errors?.email !== undefined}>
							<FieldLabel htmlFor="email">Email</FieldLabel>
							<Input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								aria-invalid={state.errors?.email !== undefined}
							/>
							<FieldDescription>
								First time here? Signing in creates your account.
							</FieldDescription>
							<FieldError>{state.errors?.email?.[0]}</FieldError>
						</Field>

						<Button type="submit" disabled={pending}>
							{pending ? <Spinner data-icon="inline-start" /> : null}
							Send sign-in link
						</Button>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
