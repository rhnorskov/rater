import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// TS 7 ships only the Go compiler; Next needs the CLI path, not the JS API.
	experimental: { useTypeScriptCli: true },
};

export default nextConfig;
