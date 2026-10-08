import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's default theme; the W10.2 type roles
 * (`text-ui`, `text-h1`… from styles/theme-extensions.css) would otherwise be
 * read as text colours and dropped next to `text-navy`.
 */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["ui", "h1", "h2", "h3"] }] } },
});

/** Merges conditional class names and resolves Tailwind class conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
