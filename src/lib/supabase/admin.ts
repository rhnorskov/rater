// Bypasses RLS. Never import from a module reachable by "use client".
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "#/lib/env";
import type { Database } from "#/lib/supabase/database.types";

export function createAdminClient() {
	return createSupabaseClient<Database>(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.SUPABASE_SECRET_KEY,
		{ auth: { persistSession: false, autoRefreshToken: false } },
	);
}
