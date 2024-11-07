"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComponentProps } from "react";

import { cn } from "@/utils/cn";

export function NavLink(props: ComponentProps<typeof Link>) {
  const { href, className, ...rest } = props;

  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      {...rest}
      href={href}
      className={cn(className, "rounded-full px-5 py-2", {
        "bg-white bg-opacity-10": isActive,
        "bg-white bg-opacity-0 hover:bg-opacity-5": !isActive,
      })}
    />
  );
}
