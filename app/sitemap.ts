import type { MetadataRoute } from "next";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * F250 — sitemap.xml 자동 생성
 * 가이드: _docs/runbook/seo.md
 *
 * 정적 페이지 + 동적 study_articles slug 포함.
 * Google·Naver Search Console에 sitemap.xml URL 제출.
 */
const BASE = "https://www.mindreframe.net";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/study`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  // /study/[slug] 동적 페이지 — DB 조회 실패해도 정적만 반환
  let studyPages: MetadataRoute.Sitemap = [];
  try {
    const sb = await createSupabaseServerClient();
    const { data } = await sb
      .from("study_articles")
      .select("slug, updated_at")
      .limit(200);
    studyPages = (data ?? []).map((a) => ({
      url: `${BASE}/study/${a.slug as string}`,
      lastModified: a.updated_at ? new Date(a.updated_at as string) : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // 마이그 미적용 환경 등 — 정적 페이지만 반환
  }

  return [...staticPages, ...studyPages];
}
