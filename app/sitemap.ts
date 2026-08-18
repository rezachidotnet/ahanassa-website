import type { MetadataRoute } from "next";
import { siteHomepageUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteHomepageUrl }];
}
