import type { MetadataRoute } from "next";

/**
 * F250 — robots.txt 자동 생성
 * 가이드: _docs/runbook/seo.md
 *
 * 공개 페이지(/ /study /pricing /terms /privacy /login)는 색인 허용,
 * 로그인 후 페이지 + /admin + /api는 색인 차단.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/dashboard",
          "/chat",
          "/trash",
          "/coach",
          "/mypage",
          "/progress",
          "/exercise",
          "/meditation",
          "/onboarding",
          "/checkout",
          "/auth",
          "/_next",
        ],
      },
    ],
    sitemap: "https://www.mindreframe.net/sitemap.xml",
    host: "https://www.mindreframe.net",
  };
}
