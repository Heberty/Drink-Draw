import type { NextConfig } from "next";

const config: NextConfig = {
  outputFileTracingIncludes: { "/*": ["./scripts/sqlite_bridge.py"] },
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default config;
