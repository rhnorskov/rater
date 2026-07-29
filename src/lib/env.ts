import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
	// Accessing these from the client throws.
	server: {
		SUPABASE_SECRET_KEY: z.string().min(1),
	},
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
