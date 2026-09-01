import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  outputFileTracingIncludes: {
    "/**": ["./data/**/*"],
  },
};

export default nextConfig;
