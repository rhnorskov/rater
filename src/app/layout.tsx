import "./globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cn } from "#/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
	title: "rater",
};

export default function RootLayout(props: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			className={cn("h-full antialiased", "font-sans", geist.variable)}
		>
			<body className="flex min-h-full flex-col">{props.children}</body>
		</html>
	);
}
