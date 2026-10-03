import type { NextConfig } from "next";

/**
 * Static export config, copied as next.config.ts into .static-build/ by scripts/static/build.ts.
 * `generateBuildId` + `deploymentId`: deterministic per code commit (AHANASSA_STATIC_BUILD_ID, set by
 * build.ts), so the same code + snapshot give byte-identical public files (W4). vinext's defaults are a
 * random UUID per build for both; the RSC compatibility id is baked into the client bundle.
 */
const buildId = process.env.AHANASSA_STATIC_BUILD_ID;
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  generateBuildId: async () => buildId ?? null,
  ...(buildId ? { deploymentId: buildId } : {}),
};

export default nextConfig;
