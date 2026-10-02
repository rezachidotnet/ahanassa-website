"use client";

import { usePathname } from "next/navigation";
import { toPublicPathname } from "@/config/locales";

/**
 * `usePathname()` as the visitor sees it: identical on the SSR runtime and in
 * the static export, where fa pages are prerendered at `/fa/...` and served
 * from the root (config/locales.ts#toPublicPathname). Every component that
 * derives links or active state from the current path uses this hook.
 */
export function usePublicPathname(): string {
  return toPublicPathname(usePathname() ?? "/");
}
