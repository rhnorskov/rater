import "server-only";
import { createEnv } from "@t3-oss/env-nextjs";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { z } from "zod";

// Read from process.env at runtime, never inlined, so builds must not require it.
export const serverEnv = createEnv({
	server: {
		SUPABASE_SECRET_KEY: z.string().min(1),
	},
	experimental__runtimeEnv: {},
	emptyStringAsUndefined: true,
	skipValidation: process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD,
});
