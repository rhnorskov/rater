import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Inlined into the bundle at build time, so a wrong value cannot be corrected at
// runtime. Always validated, builds included.
export const clientEnv = createEnv({
	client: {
		NEXT_PUBLIC_SUPABASE_URL: z.url(),
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
	},
	// Next bundles only statically-accessed env vars, so client keys are destructured by hand.
	experimental__runtimeEnv: {
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	},
	emptyStringAsUndefined: true,
});
