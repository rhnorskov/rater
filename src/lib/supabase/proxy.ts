import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { objectEntries } from "ts-extras";
import { env } from "#/lib/env";

const PUBLIC_PREFIXES = ["/auth"];

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	// Fluid compute reuses processes across requests, so this client must stay request-scoped.
	const supabase = createServerClient(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet, headers) {
					for (const { name, value } of cookiesToSet) {
						request.cookies.set(name, value);
					}
					supabaseResponse = NextResponse.next({
						request,
					});
					for (const { name, value, options } of cookiesToSet) {
						supabaseResponse.cookies.set(name, value, options);
					}
					for (const [key, value] of objectEntries(headers)) {
						supabaseResponse.headers.set(key, value);
					}
				},
			},
		},
	);

	// Refreshes an expiring token. Nothing may run between createServerClient and
	// getClaims, or sessions drop at random.
	const { data } = await supabase.auth.getClaims();

	const user = data?.claims;

	const isPublic = PUBLIC_PREFIXES.some((prefix) =>
		request.nextUrl.pathname.startsWith(prefix),
	);

	if (!user && !isPublic) {
		return NextResponse.redirect(new URL("/auth/signin", request.nextUrl));
	}

	// /auth/confirm still has to run while signed in, so only the entry points bounce.
	if (user && request.nextUrl.pathname.startsWith("/auth/signin")) {
		return NextResponse.redirect(new URL("/", request.nextUrl));
	}

	// Return this exact object. Any replacement must be built from the same request and
	// carry the cookies over, or the browser and server sessions desync:
	// other.cookies.setAll(supabaseResponse.cookies.getAll())
	return supabaseResponse;
}
