import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "#/lib/env";

const PUBLIC_PREFIXES = ["/login", "/auth"];

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({ request });

	const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet, headers) {
				for (const { name, value } of cookiesToSet) {
					request.cookies.set(name, value);
				}
				supabaseResponse = NextResponse.next({ request });
				for (const { name, value, options } of cookiesToSet) {
					supabaseResponse.cookies.set(name, value, options);
				}
				// Cache-Control/Expires/Pragma: stop a CDN caching this Set-Cookie.
				for (const [key, headerValue] of Object.entries(headers)) {
					supabaseResponse.headers.set(key, headerValue);
				}
			},
		},
	});

	// Nothing may await between createServerClient and getClaims, or sessions drop at random.
	const { data } = await supabase.auth.getClaims();
	const claims = data?.claims ?? null;

	const isPublic = PUBLIC_PREFIXES.some((prefix) =>
		request.nextUrl.pathname.startsWith(prefix),
	);
	if (!claims && !isPublic) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.redirect(url);
	}

	// Return this exact object. Any substitute must carry the cookies over:
	// other.cookies.setAll(supabaseResponse.cookies.getAll())
	return supabaseResponse;
}
