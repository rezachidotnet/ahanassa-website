/**
 * Spike S1 — `next/navigation` wrapper for the static build only. fa pages
 * are prerendered at /fa/... (no middleware rewrite exists at build time)
 * and then moved to the root, so usePathname() would report "/fa/..." in
 * the static fa HTML. This strips that prefix so the language switcher and
 * active-nav state match the public, unprefixed fa URL. Everything else is
 * re-exported unchanged.
 */
import { usePathname as baseUsePathname } from "vinext/shims/navigation";

export * from "vinext/shims/navigation";

export function usePathname(): string {
  const pathname = baseUsePathname();
  if (pathname === "/fa") return "/";
  if (pathname?.startsWith("/fa/")) return pathname.slice(3);
  return pathname;
}
