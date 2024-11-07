import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/services/supabase/server";

const searchParamsSchema = z.object({
  type: z.enum(["invite", "recovery", "email_change", "email"]),
  token_hash: z.string(),
  redirect_to: z.string().default("/"),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const validatedParams = searchParamsSchema.safeParse(
    Object.fromEntries(searchParams),
  );

  if (validatedParams.success) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      type: validatedParams.data.type,
      token_hash: validatedParams.data.token_hash,
    });

    if (error) {
      console.error(error);
    }

    if (data.user) {
      return NextResponse.redirect(
        new URL(validatedParams.data.redirect_to, request.nextUrl),
      );
    }
  }

  return NextResponse.error();
}
