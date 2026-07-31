import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "rater",
};

export default function RootLayout(props: LayoutProps<"/">) {
	return (
		<html lang="en" className="h-full antialiased">
			<body className="flex min-h-full flex-col">{props.children}</body>
		</html>
	);
}
