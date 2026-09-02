/**
 * Small inline WhatsApp glyph — lucide-react (the project's only icon
 * library) has no WhatsApp brand icon, and pulling in a full icon-pack
 * dependency for one glyph isn't warranted. Standard simplified WhatsApp
 * "speech bubble + handset" mark, sized/colored via the `size-*` /
 * `currentColor` convention already used by every lucide icon in this
 * codebase (components/layout/SiteHeader.tsx, components/home/hero.tsx).
 */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.92 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.55-3.7 8.25-8.25 8.25a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.19-.31a8.15 8.15 0 0 1-1.26-4.37c0-4.55 3.7-8.26 8.25-8.26Zm-4.53 4.6c-.16 0-.42.06-.64.31s-.85.83-.85 2.03.87 2.35.99 2.51c.12.16 1.7 2.72 4.24 3.71 2.1.82 2.53.66 2.98.62.46-.04 1.48-.6 1.68-1.19.21-.58.21-1.08.15-1.19-.06-.1-.23-.16-.48-.29-.25-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.56.13-.16.24-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.43-.06-.12-.56-1.36-.78-1.86-.2-.49-.41-.42-.56-.43a8.16 8.16 0 0 0-.48-.01Z" />
    </svg>
  );
}
