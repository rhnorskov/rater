export type ErrorMessageProps = {
  error?: string | string[];
};

export function ErrorMessage(props: ErrorMessageProps) {
  return (
    <div className="text-xs text-red-500">
      {Array.isArray(props.error) ? props.error.join(", ") : props.error}
    </div>
  );
}
