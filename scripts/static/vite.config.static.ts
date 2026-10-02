import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import vinext from "vinext";

/**
 * Vite config for the STATIC export (architecture V1.1 §7.1 step 4). Copied
 * as vite.config.ts into the generated build root (.static-build/) by
 * scripts/static/build.ts — never used for the Worker build. No
 * @cloudflare/vite-plugin, no CDN/image adapters: plain vinext, with
 * `cloudflare:workers` resolved to the snapshot-backed build runtime.
 */
const root = import.meta.dirname;

function staticBuildRuntime(): Plugin {
  const target = path.resolve(root, "lib/static/build-runtime/cloudflare-workers.ts");
  return {
    name: "ahanassa-static-build-runtime",
    enforce: "pre",
    resolveId(source) {
      return source === "cloudflare:workers" ? target : null;
    },
  };
}

export default defineConfig({ plugins: [staticBuildRuntime(), vinext()] });
