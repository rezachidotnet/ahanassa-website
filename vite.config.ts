import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { cdnAdapter } from "@vinext/cloudflare/cache/cdn-adapter";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";

// Spike S1: SPIKE_STATIC_EXPORT=1 builds the public site as plain static
// files (next.config.ts output: 'export') in Node, without the Cloudflare
// Vite plugin. Module substitutions for that build only:
//   cloudflare:workers -> fixture-backed DB_PUBLIC shim (build-time data)
//   next/link          -> plain <a> (no RSC navigation/prefetch requests)
//   next/navigation    -> usePathname without the build-time /fa prefix
// vinext resolves next/* itself, so a pre-enforced resolveId plugin placed
// before vinext() is used instead of resolve.alias.
const staticExport = process.env.SPIKE_STATIC_EXPORT === "1";
const here = import.meta.dirname;

function spikeStaticSubstitutions(): Plugin {
  const map: Record<string, string> = {
    "cloudflare:workers": path.resolve(here, "spike/static/cf-workers-shim.ts"),
    "next/link": path.resolve(here, "spike/static/plain-link.tsx"),
    // vinext rewrites `next/link` imports to its absolute shim path before resolution.
    [path.resolve(here, "node_modules/vinext/dist/shims/link")]: path.resolve(here, "spike/static/plain-link.tsx"),
    [path.resolve(here, "node_modules/vinext/dist/shims/link.js")]: path.resolve(here, "spike/static/plain-link.tsx"),
    "next/navigation": path.resolve(here, "spike/static/navigation.ts"),
  };
  return {
    name: "spike-s1-static-substitutions",
    enforce: "pre",
    resolveId(source, importer) {
      const target = map[source];
      if (!target) return null;
      // The wrapper itself imports the real vinext shim.
      if (importer && path.resolve(importer) === target) return null;
      return target;
    },
  };
}

export default defineConfig(
  staticExport
    ? { plugins: [spikeStaticSubstitutions(), vinext()] }
    : {
        plugins: [
          vinext({
            cache: { cdn: cdnAdapter() },
            images: { optimizer: imagesOptimizer() },
          }),
          cloudflare({
            viteEnvironment: {
              name: "rsc",
              childEnvironments: ["ssr"],
            },
          }),
        ],
      },
);
