import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { pathToFileURL } from "node:url";
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

/**
 * W21.2: while live chat is off (config/livechat.ts), the live-chat button resolves to a server-only stub
 * (components/livechat/livechat-off.ts), so the build carries none of its client JS. While on: the real button.
 */
export const LIVECHAT_BUTTON_SPECIFIER = "@/components/livechat/livechat-button";
/** That import as written, or after Vite expanded the `@/` alias (aliases resolve before any plugin sees an import). */
const LIVECHAT_BUTTON_IMPORT = /(?:^@\/|\/)components\/livechat\/livechat-button(?:\.tsx)?$/;

async function livechatOff(): Promise<Plugin> {
  // The build root's copy of config/livechat.ts (this file runs from .static-build/, scripts/static/build.ts).
  const { livechatConfig } = (await import(pathToFileURL(path.resolve(root, "config/livechat.ts")).href)) as typeof import("../../config/livechat.ts");
  const off = !livechatConfig();
  const stub = path.resolve(root, "components/livechat/livechat-off.ts");
  return {
    name: "ahanassa-livechat-off",
    enforce: "pre",
    resolveId(source) {
      return off && LIVECHAT_BUTTON_IMPORT.test(source) ? stub : null;
    },
  };
}

export default defineConfig({ plugins: [staticBuildRuntime(), await livechatOff(), vinext()] });
