"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/services/supabase/server";

const signInSchema = z.object({
  email: z.string().email(),
  redirectTo: z.string().optional(),
});

export type SignInState = {
  data?: z.infer<typeof signInSchema>;
  error?: z.inferFlattenedErrors<typeof signInSchema>;
};

export async function signIn(
  _: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const supabase = await createClient();

  const validatedFields = signInSchema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten(),
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: validatedFields.data.email,
    options: {
      emailRedirectTo: validatedFields.data.redirectTo,
    },
  });

  if (error) {
    return {
      error: {
        formErrors: [error.message],
        fieldErrors: {},
      },
    };
  }

  revalidatePath("/", "layout");

  return {
    data: validatedFields.data,
  };
}
