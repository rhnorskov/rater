import { redirect } from "next/navigation";

import { createClient } from "@/services/supabase/server";
import { PageProps } from "@/types/page-props";

import { SignInForm } from "./form";

export type SignInPageProps = PageProps<undefined, { redirect_to?: string }>;

export default async function SignInPage(props: SignInPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const { redirect_to } = await props.searchParams;

  if (data.user) {
    redirect("/");
  }

  return (
    <div className="mx-auto mt-56 flex w-80 flex-col gap-4">
      <h1 className="text-center text-3xl font-bold">Sign In</h1>

      <SignInForm redirectTo={redirect_to} />
    </div>
  );
}
