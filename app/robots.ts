import type { MetadataRoute } from "next";
import { getAppEnv } from "@/lib/env";
import { siteConfig } from "@/lib/metadata/site";

export default function robots(): MetadataRoute.Robots {
  const isProduction = getAppEnv() === "production";

  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${siteConfig.baseUrl}/sitemap.xml`,
  };
}
