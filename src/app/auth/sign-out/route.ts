import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/services/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error(error);
  }

  return NextResponse.redirect(new URL("/", request.url));
}
