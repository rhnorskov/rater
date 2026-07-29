import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { clientEnv } from "#/lib/env/client";

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({ request });

	const supabase = createServerClient(
		clientEnv.NEXT_PUBLIC_SUPABASE_URL,
		clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
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
		},
	);

	// Refreshes an expiring token and writes the new cookies via setAll.
	// Nothing may await between createServerClient and getClaims, or sessions drop at random.
	await supabase.auth.getClaims();

	// Return this exact object. Any substitute must carry the cookies over:
	// other.cookies.setAll(supabaseResponse.cookies.getAll())
	return supabaseResponse;
}
