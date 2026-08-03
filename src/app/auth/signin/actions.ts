"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "#/lib/supabase/server";

const credentials = z.object({
	email: z.email("Enter a valid email address."),
});

export type SignInState = {
	message?: string;
	sentTo?: string;
	errors?: {
		email?: string[];
	};
};

export async function signIn(
	_state: SignInState,
	formData: FormData,
): Promise<SignInState> {
	const parsed = credentials.safeParse({ email: formData.get("email") });

	if (!parsed.success) {
		return { errors: z.flattenError(parsed.error).fieldErrors };
	}

	const origin = (await headers()).get("origin");
	const supabase = await createClient();

	// Creates the account on first use, so this is both sign in and sign up.
	const { error } = await supabase.auth.signInWithOtp({
		email: parsed.data.email,
		options: {
			// Falls back to auth.site_url when the origin header is absent.
			emailRedirectTo:
				origin === null ? undefined : `${origin}/auth/confirm?next=/`,
		},
	});

	if (error) {
		return { message: error.message };
	}

	return { sentTo: parsed.data.email };
}
