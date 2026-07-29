import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientEnv } from "#/lib/env/client";
import type { Database } from "#/lib/supabase/database.types";

export async function createClient() {
	const cookieStore = await cookies();

	return createServerClient<Database>(
		clientEnv.NEXT_PUBLIC_SUPABASE_URL,
		clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					try {
						for (const { name, value, options } of cookiesToSet) {
							cookieStore.set(name, value, options);
						}
					} catch {
						// Server Components cannot write cookies; the proxy persists the refreshed session.
					}
				},
			},
		},
	);
}
