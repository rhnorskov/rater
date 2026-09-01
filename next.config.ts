import "./src/lib/env";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// TS 7 ships only the Go compiler; Next needs the CLI path, not the JS API.
	experimental: { useTypeScriptCli: true },
	images: {
		// The seed stores full-size TMDB paths; next/image resizes them down.
		remotePatterns: [
			{ protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
		],
	},
};

export default nextConfig;
