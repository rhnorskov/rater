import { createClient } from "@/services/supabase/server";
import "./globals.css";

import { clsx } from "clsx";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import Link from "next/link";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = {
  title: "Rater",
  description: "Rate your favorite movies and TV shows",
};

export default async function RootLayout(props: PropsWithChildren) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getUser();

  return (
    <html lang="en" className={clsx(GeistMono.variable, GeistSans.variable)}>
      <body className="flex min-h-screen flex-col">
        <header className="flex h-14 items-center justify-between px-8">
          <h1>Rater</h1>
          <nav>
            <ul className="flex gap-4">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/movie">Movie</Link>
              </li>
            </ul>
          </nav>

          {data.user ? (
            <a href="/auth/sign-out">Sign out</a>
          ) : (
            <Link href="/auth/sign-in">Sign in</Link>
          )}
        </header>

        <main className="flex flex-grow flex-col">{props.children}</main>
      </body>
    </html>
  );
}
