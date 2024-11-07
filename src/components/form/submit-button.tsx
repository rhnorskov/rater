"use client";

import type { PropsWithChildren } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton(props: PropsWithChildren) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-white px-4 py-3 text-black hover:bg-gray-300 disabled:bg-gray-300"
    >
      {props.children}
    </button>
  );
}
