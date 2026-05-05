import type { MetadataRoute } from "next";
import { getEnv } from "@/lib/env";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = getEnv().BETTER_AUTH_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/courses", "/instructor", "/legal", "/verify"],
        disallow: [
          "/admin",
          "/account",
          "/api",
          "/learn",
          "/checkout",
          "/_dev",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
