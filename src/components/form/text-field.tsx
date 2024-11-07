import type { InputHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

import { ErrorMessage, type ErrorMessageProps } from "./error-message";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: ErrorMessageProps["error"];
};

export function TextField(props: TextFieldProps) {
  const { error, ...rest } = props;

  return (
    <div className="flex flex-col gap-1">
      <input
        {...rest}
        className={cn(
          "w-full rounded-lg border border-white bg-transparent px-4 py-3 text-white placeholder-gray-300 outline-none focus-visible:ring-1 focus-visible:ring-white",
        )}
      />

      <ErrorMessage error={error} />
    </div>
  );
}
