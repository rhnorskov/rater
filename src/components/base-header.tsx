"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";

import { createClient } from "@/services/supabase/client";

import { NavLink } from "./nav-link";
import { StarIcon } from "./star-icon";
import { TrophyIcon } from "./trophy-icon";

interface Headerprops {
  mainText?: string;
  subText?: string;
  buttonText?: string;
}

export function BaseHeader({
  mainText = "",
  subText = "",
  buttonText = "",
}: Headerprops) {
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    return redirect("/");
  };

  return (
    <header className="grid grid-cols-header items-start px-8 py-4">
      <div className="flex items-center">
        <Link href="/" className="mr-6 text-lg font-semibold">
          Favorate
        </Link>
        <NavLink href="/movie" className="flex items-center gap-2">
          <StarIcon className="size-4 fill-white" />
          Rate
        </NavLink>
        <NavLink href="/movie/list" className="flex items-center gap-2">
          <TrophyIcon className="size-4 fill-white" />
          Your list
        </NavLink>
      </div>

      <div className="flex flex-col items-center">
        <p className="text-opacity-90">{mainText}</p>
        <p className="text-opacity-10">{subText}</p>
        <button
          className="mt-2 rounded-full border border-white border-opacity-5 bg-white bg-opacity-10 px-5 py-2 hover:bg-opacity-15"
          onClick={() => window.location.reload()}
        >
          {buttonText}
        </button>
      </div>

      <button
        className="flex cursor-pointer items-start justify-end"
        onClick={handleSignOut}
      >
        Sign out
      </button>
    </header>
  );
}
