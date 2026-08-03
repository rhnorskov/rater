import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "#/lib/supabase/server";

// Mirrors EmailOtpType from @supabase/supabase-js; validated rather than cast so a
// malformed link fails here instead of inside verifyOtp.
const otpType = z.enum([
	"email",
	"signup",
	"invite",
	"magiclink",
	"recovery",
	"email_change",
]);

// A caller-supplied absolute URL would turn this into an open redirect.
function safeNext(value: string | null): string {
	if (value === null || !value.startsWith("/") || value.startsWith("//")) {
		return "/";
	}
	return value;
}

export async function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl;
	const next = safeNext(searchParams.get("next"));
	const supabase = await createClient();

	// Default email templates produce a PKCE code; templates rewritten to use
	// {{ .TokenHash }} produce a token_hash instead. Accept either.
	const code = searchParams.get("code");
	if (code !== null) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		redirect(error ? "/auth/error" : next);
	}

	const tokenHash = searchParams.get("token_hash");
	const type = otpType.safeParse(searchParams.get("type"));
	if (tokenHash === null || !type.success) {
		redirect("/auth/error");
	}

	const { error } = await supabase.auth.verifyOtp({
		type: type.data,
		token_hash: tokenHash,
	});

	redirect(error ? "/auth/error" : next);
}
