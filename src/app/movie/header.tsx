import { BaseHeader } from "@/components/base-header";

export function MovieHeader() {
  return (
    <BaseHeader
      mainText="Select the movie you like better, or press skip if uncertain."
      subText="Press 1 or 2 for selection, 3 to skip."
      buttonText="Skip"
    />
  );
}
