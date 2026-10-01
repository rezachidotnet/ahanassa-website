import type { NextConfig } from "next";

// Spike S1: fully static output when SPIKE_STATIC_EXPORT=1 (see vite.config.ts).
const nextConfig: NextConfig =
  process.env.SPIKE_STATIC_EXPORT === "1" ? { output: "export", images: { unoptimized: true } } : {};

export default nextConfig;
