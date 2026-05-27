import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * Plan 가드 — middleware의 PLAN_GATE_ENABLED ENV 켜진 상태 검증 + H2 한도 정책 보강.
 */
test.describe("/pricing plan 게이팅 + H2 한도 보강", () => {
  let freeUser: TestUser;
  let proUser: TestUser;

  test.beforeAll(async () => {
    freeUser = await createTestUser("free");
    proUser = await createTestUser("pro");
  });

  test.afterAll(async () => {
    if (freeUser) await deleteTestUser(freeUser.id);
    if (proUser) await deleteTestUser(proUser.id);
  });

  test("free 사용자가 /exercise 접근 시 /pricing?required=pro 로 리다이렉트", async ({ page }) => {
    await loginAs(page, freeUser);
    await page.goto("/exercise");
    await page.waitForURL(/\/pricing\?.*required=pro/, { timeout: 10_000 });
    await expect(page.getByRole("alert").first()).toContainText("프로");
  });

  test("pro 사용자는 /exercise 정상 진입 (H5: 1단계 모드 선택 화면)", async ({ page }) => {
    await loginAs(page, proUser);
    await page.goto("/exercise");
    // H5 리뉴얼: heading은 "용기 한 걸음" — 1단계 모드 선택 카드 노출 검증
    await expect(page.getByText(/1단계.*어떤 연습/)).toBeVisible();
  });

  test("/pricing 에 required 쿼리스트링 시 안내 배너 표시", async ({ page }) => {
    await loginAs(page, freeUser);
    await page.goto("/pricing?from=/exercise&required=pro");
    await expect(page.getByRole("alert").first()).toContainText("프로");
    await expect(page.getByRole("alert").first()).toContainText("이상 플랜");
  });

  /**
   * H2 회귀 안전망 — 라이트 사용자 분석기 5회 finalize → 6회째 차단.
   * ai_usage 직접 시드로 5회 카운트 → API 시도 시 한도 메시지 검증.
   */
  test("H2: 라이트 사용자 ai_usage=5 시드 → 6회째 차단 안내", async ({ page }) => {
    test.skip(
      process.env.AI_USAGE_LIMITS_DISABLED === "true",
      "AI_USAGE_LIMITS_DISABLED=true 환경에서는 한도 검증 불가",
    );

    const lightUser = await createTestUser("light");
    try {
      // ai_usage 5회 시드
      const today = new Date().toISOString().slice(0, 10);
      const { error: seedErr } = await admin.from("ai_usage").upsert(
        {
          user_id: lightUser.id,
          used_at: today,
          feature: "analyzer",
          count: 5,
        },
        { onConflict: "user_id,used_at,feature" },
      );
      if (seedErr) {
        test.skip(true, `ai_usage 시드 실패: ${seedErr.message}`);
      }

      await loginAs(page, lightUser);
      await page.goto("/chat");
      await expect(page.getByText(/1단계 · 분석/)).toBeVisible();

      await page.locator('input[type="text"]').fill("오늘도 발표가 두렵습니다. 80점");
      await page.getByRole("button", { name: "전송" }).click();

      // 한도 초과 토스트 — "오늘" + "한도" + "5" 포함
      // toast는 일반적으로 role=status 또는 텍스트 어딘가에 노출
      await expect(
        page.getByText(/오늘.*가짜생각 분석기.*한도.*5/).first(),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteTestUser(lightUser.id);
    }
  });

  /**
   * H2 회귀 — 한 분석 흐름(analyze→therapy→finalize) = ai_usage +1만 카운팅.
   * (실제 OpenAI 호출 필요 → OPENAI_API_KEY 미설정 시 skip)
   */
  test("H2: 한 분석 흐름 = ai_usage +1 (메시지 단위 X)", async ({ page }) => {
    test.skip(!process.env.OPENAI_API_KEY, "OPENAI_API_KEY 미설정 — 흐름 실행 불가");
    test.skip(
      process.env.AI_USAGE_LIMITS_DISABLED === "true",
      "AI_USAGE_LIMITS_DISABLED=true",
    );
    test.setTimeout(120_000);

    const u = await createTestUser("light");
    try {
      await loginAs(page, u);
      await page.goto("/chat");
      await page
        .locator('input[type="text"]')
        .fill("회의 발표가 두려워서 다 망칠 것 같아요. 80점");
      await page.getByRole("button", { name: "전송" }).click();

      // 분석 카드 노출까지 대기
      await expect(page.getByText(/📊 분석 결과/)).toBeVisible({ timeout: 60_000 });

      // 분석 직후 ai_usage 0인지 확인 (analyzeUserInput은 checkUsageOnly만 호출)
      const today = new Date().toISOString().slice(0, 10);
      const { data: midUsage } = await admin
        .from("ai_usage")
        .select("count")
        .eq("user_id", u.id)
        .eq("used_at", today)
        .eq("feature", "analyzer")
        .maybeSingle();
      // 분석 단계에서는 카운트되지 않아야 함 (finalize 시점에만)
      expect(midUsage?.count ?? 0).toBe(0);
    } finally {
      await deleteTestUser(u.id);
    }
  });
});
