import type { ComponentProps, CSSProperties } from "react";
import { preload } from "react-dom";
import { IMAGE_VARIANTS } from "@/lib/media/image-variants.generated";
import { variantPath, type ImageFormat } from "@/lib/media/image-sources";

/**
 * The site's image component (W16.5). Same call shape as the `next/image`
 * props this codebase used (`src`, `alt`, `fill`, `sizes`, `priority`), but
 * renders the pre-encoded AVIF/WebP variants of lib/media/image-sources.ts as
 * a `<picture>` with `srcset` — the static export has no image optimizer, so
 * `next/image` served the multi-megabyte originals unchanged.
 *
 * - `priority`: eager, `fetchpriority="high"`, and one `<link rel="preload">`
 *   for the AVIF set. Use it on the page's LCP image only.
 * - otherwise `loading="lazy"`.
 * - `width`/`height` are always emitted (the original's, unless given), so the
 *   box is reserved before load; `fill` additionally covers the positioned parent.
 *
 * A `src` with no variants (the SVG placeholder) renders a plain `<img>`.
 */
type ImageProps = Omit<ComponentProps<"img">, "src" | "width" | "height" | "loading" | "srcSet"> & {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
};

const FILL_STYLE: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };

function decodedPath(src: string): string {
  try {
    return decodeURI(src);
  } catch {
    return src;
  }
}

export default function Image({ src, alt, fill, width, height, sizes, priority, style, ...rest }: ImageProps) {
  const imgStyle = fill ? { ...FILL_STYLE, ...style } : style;
  const loading = priority ? "eager" : "lazy";
  const fetchPriority = priority ? "high" : undefined;
  const key = decodedPath(src);
  const entry = IMAGE_VARIANTS[key];

  if (!entry) {
    return <img src={src} alt={alt} width={width} height={height} sizes={sizes} loading={loading} fetchPriority={fetchPriority} decoding="async" style={imgStyle} {...rest} />;
  }

  const srcSet = (format: ImageFormat) => entry.widths.map((w) => `${variantPath(key, w, format)} ${w}w`).join(", ");
  const resolvedSizes = sizes ?? (fill ? "100vw" : `${width ?? entry.width}px`);
  const avif = srcSet("avif");
  // Fallback for a browser that ignores both <source>s: the WebP closest to 960 wide.
  const fallbackWidth = [...entry.widths].reverse().find((w) => w <= 960) ?? entry.widths[0];

  if (priority) preload(variantPath(key, fallbackWidth, "avif"), { as: "image", imageSrcSet: avif, imageSizes: resolvedSizes, type: "image/avif", fetchPriority: "high" });

  return (
    <picture>
      <source type="image/avif" srcSet={avif} sizes={resolvedSizes} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={resolvedSizes} />
      <img
        src={variantPath(key, fallbackWidth, "webp")}
        alt={alt}
        width={width ?? entry.width}
        height={height ?? (width ? Math.round((width * entry.height) / entry.width) : entry.height)}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={priority ? undefined : "async"}
        style={imgStyle}
        {...rest}
      />
    </picture>
  );
}
