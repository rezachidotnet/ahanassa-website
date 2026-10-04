import type { MetadataRoute } from "next";
import { getAppEnv } from "@/lib/env";
import { siteConfig } from "@/lib/metadata/site";
import { PRODUCTION_ROBOTS_DISALLOW } from "@/lib/seo/indexing-policy";

export default function robots(): MetadataRoute.Robots {
  const isProduction = getAppEnv() === "production";

  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  // D6 (docs/OWNER_DECISIONS.md): allow all; disallow only the technical paths (lib/seo/indexing-policy.ts).
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...PRODUCTION_ROBOTS_DISALLOW] }],
    sitemap: `${siteConfig.baseUrl}/sitemap.xml`,
  };
}
