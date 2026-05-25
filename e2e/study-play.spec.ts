import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * 영상 게이트 테스트용 study_article seed.
 * required_plan='pro'로 설정 — free는 차단, pro 이상 통과.
 * video_id는 null이라 VideoPlayer 대신 placeholder가 노출됨 (외부 의존 회피).
 */
async function seedArticle(opts: {
  slug: string;
  requiredPlan: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const { error } = await admin.from("study_articles").insert({
    slug: opts.slug,
    category: "core",
    title: `e2e ${opts.slug}`,
    body_html: "<p>e2e test body</p>",
    order_index: 0,
    video_id: null,
    required_plan: opts.requiredPlan,
  });
  if (error) {
    if (
      (error as { code?: string }).code === "42703" ||
      /required_plan|video_id/.test(error.message)
    ) {
      return { ok: false, reason: "study_articles 컬럼 부재 (마이그 미적용)" };
    }
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

async function deleteArticle(slug: string) {
  await admin.from("study_articles").delete().eq("slug", slug).then(() => {});
}

function makeSlug() {
  return `e2e-play-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

test.describe("F78 — /study/[slug]/play 영상 페이지", () => {
  test("free 사용자 → required_plan=pro 페이지 진입 차단 (→ /pricing)", async ({
    page,
  }) => {
    const slug = makeSlug();
    const seeded = await seedArticle({ slug, requiredPlan: "pro" });
    test.skip(!seeded.ok, seeded.reason ?? "");

    const user = await createTestUser("free");
    try {
      await loginAs(page, user);
      await page.goto(`/study/${slug}/play`);

      // /pricing?required=pro로 redirect
      await page.waitForURL(/\/pricing\?required=pro/);
      await expect(
        page.getByText(/프로.*플랜에서 이용 가능/),
      ).toBeVisible();
    } finally {
      await deleteArticle(slug);
      await deleteTestUser(user.id);
    }
  });

  test("pro 사용자 → 페이지 진입 + placeholder 노출 (video_id 없음)", async ({
    page,
  }) => {
    const slug = makeSlug();
    const seeded = await seedArticle({ slug, requiredPlan: "pro" });
    test.skip(!seeded.ok, seeded.reason ?? "");

    const user = await createTestUser("pro");
    try {
      await loginAs(page, user);
      await page.goto(`/study/${slug}/play`);

      // 가드 통과 — placeholder 노출 (video_id 없음)
      await expect(page.getByTestId("video-placeholder")).toBeVisible();
      await expect(page.getByText("영상 준비 중입니다")).toBeVisible();
    } finally {
      await deleteArticle(slug);
      await deleteTestUser(user.id);
    }
  });

  test("required_plan=null (공개) — 비로그인도 진입 가능", async ({ page }) => {
    const slug = makeSlug();
    const seeded = await seedArticle({ slug, requiredPlan: null });
    test.skip(!seeded.ok, seeded.reason ?? "");

    try {
      await page.goto(`/study/${slug}/play`);
      await expect(page.getByTestId("video-placeholder")).toBeVisible();
    } finally {
      await deleteArticle(slug);
    }
  });
});
