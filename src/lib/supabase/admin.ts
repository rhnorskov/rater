// Bypasses RLS. Never import from a module reachable by "use client".
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { required, SUPABASE_URL } from "#/lib/env";
import type { Database } from "#/lib/supabase/database.types";

export function createAdminClient() {
	// Read lazily so importing this module does not throw where the key is absent.
	const secretKey = required(
		"SUPABASE_SECRET_KEY",
		process.env.SUPABASE_SECRET_KEY,
	);

	return createSupabaseClient<Database>(SUPABASE_URL, secretKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}
