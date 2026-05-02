import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/transcribe", "/auth/"],
      },
    ],
    sitemap: "https://fastcaption.app/sitemap.xml",
  };
}
