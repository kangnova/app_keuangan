import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://artaku.my.id/sitemap.xml",
    host: "https://artaku.my.id",
  };
}
