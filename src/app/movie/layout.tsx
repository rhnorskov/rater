import type { ReactNode } from "react";

export interface MovieLayoutProps {
  children: ReactNode;
}

export default function MovieLayout({ children }: MovieLayoutProps) {
  return (
    <div className="flex h-screen flex-col">
      <main className="h-full">{children}</main>
    </div>
  );
}
