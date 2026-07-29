// Bypasses RLS. Never import from a module reachable by "use client".
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { clientEnv } from "#/lib/env/client";
import { serverEnv } from "#/lib/env/server";
import type { Database } from "#/lib/supabase/database.types";

export function createAdminClient() {
	return createSupabaseClient<Database>(
		clientEnv.NEXT_PUBLIC_SUPABASE_URL,
		serverEnv.SUPABASE_SECRET_KEY,
		{ auth: { persistSession: false, autoRefreshToken: false } },
	);
}
