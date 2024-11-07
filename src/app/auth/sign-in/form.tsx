"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/form/submit-button";
import { TextField } from "@/components/form/text-field";
import { env } from "@/env";

import { signIn } from "./actions";

export type SignInFormProps = {
  redirectTo?: string;
};

export function SignInForm(props: SignInFormProps) {
  const [state, formAction] = useActionState(signIn, {});

  return (
    <form action={formAction} className="flex flex-col gap-4 text-center">
      {!state.data?.email && (
        <>
          <input
            type="hidden"
            name="redirectTo"
            value={env.NEXT_PUBLIC_ORIGIN + props.redirectTo}
          />
          <TextField
            name="email"
            type="email"
            required={true}
            placeholder="Email"
            error={state.error?.fieldErrors.email}
          />

          <SubmitButton>Sign In</SubmitButton>
        </>
      )}

      {state.data?.email && (
        <>
          <input type="hidden" name="email" value={state.data.email} />
          <p>
            We&apos;ve sent a sign-in link to{" "}
            <strong>{state.data.email}</strong>.
          </p>
          <p>Please check your inbox and click the link to proceed.</p>
          <SubmitButton>Resend</SubmitButton>
        </>
      )}
    </form>
  );
}
