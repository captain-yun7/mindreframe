import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("F68 — /pricing 3플랜 + 추천 강화 + AI 잔존 제거", () => {
  test("비로그인: 3플랜 동시 노출 + 기본 추천 pro", async ({ page }) => {
    await page.goto("/pricing");

    const light = page.getByTestId("plan-card-light");
    const pro = page.getByTestId("plan-card-pro");
    const premium = page.getByTestId("plan-card-premium");

    await expect(light).toBeVisible();
    await expect(pro).toBeVisible();
    await expect(premium).toBeVisible();

    // 비로그인 default = pro 추천
    await expect(pro).toHaveAttribute("data-recommended", "true");
    await expect(light).toHaveAttribute("data-recommended", "false");
    await expect(premium).toHaveAttribute("data-recommended", "false");

    // 추천 카드 뱃지 노출
    await expect(pro.getByText(/당신에게 추천/)).toBeVisible();
  });

  test("고점수 설문 후: premium 추천", async ({ page }) => {
    const user = await createTestUser("free");
    // depression 27/27 + anxiety 21/21 → 합산 200%+ → premium
    await admin.from("survey_responses").insert({
      user_id: user.id,
      channel: "test",
      gender: "other",
      age_group: "20s",
      concern_areas: ["test"],
      depression_answers: [3, 3, 3, 3, 3, 3, 3, 3, 3],
      depression_score: 27,
      depression_severity: "severe",
      anxiety_answers: [3, 3, 3, 3, 3, 3, 3],
      anxiety_score: 21,
      anxiety_severity: "severe",
      recommended_track: "balanced",
      completed_at: new Date().toISOString(),
    });

    await loginAs(page, user);
    await page.goto("/pricing");

    await expect(page.getByTestId("plan-card-premium")).toHaveAttribute(
      "data-recommended",
      "true",
    );
    await expect(page.getByTestId("plan-card-pro")).toHaveAttribute(
      "data-recommended",
      "false",
    );

    await deleteTestUser(user.id);
  });

  test("?required=premium 진입 시 premium 강조", async ({ page }) => {
    await page.goto("/pricing?required=premium&from=/dashboard");
    await expect(page.getByTestId("plan-card-premium")).toHaveAttribute(
      "data-recommended",
      "true",
    );
    // 가드 안내 배너 노출
    await expect(page.getByRole("alert")).toContainText("프리미엄");
  });

  test("AI 잔존 텍스트 없음 (사용자 가시 영역)", async ({ page }) => {
    await page.goto("/pricing");

    // 단어 단독 "AI" 또는 "라이트 AI" 류 잔존 0건
    await expect(page.locator("body")).not.toContainText("라이트 AI");
    await expect(page.locator("body")).not.toContainText("AI 인지행동치료");
    await expect(page.locator("body")).not.toContainText("AI 분석");

    // footer
    const footer = page.locator("footer");
    if ((await footer.count()) > 0) {
      await expect(footer).not.toContainText(/AI 인지행동치료/);
    }
  });
});
