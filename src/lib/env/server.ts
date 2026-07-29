import "server-only";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Read from process.env at runtime, never inlined. Builds do not evaluate this
// module, so a build that starts demanding the secret means secret-using code
// has crept into the build graph — which should fail loudly.
export const serverEnv = createEnv({
	server: {
		SUPABASE_SECRET_KEY: z.string().min(1),
	},
	experimental__runtimeEnv: {},
	emptyStringAsUndefined: true,
});
