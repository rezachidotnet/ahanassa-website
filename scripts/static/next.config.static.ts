import type { NextConfig } from "next";

/** Static export config, copied as next.config.ts into .static-build/ by scripts/static/build.ts. */
const nextConfig: NextConfig = { output: "export", images: { unoptimized: true } };

export default nextConfig;
