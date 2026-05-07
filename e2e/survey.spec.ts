import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

test.describe("/survey 온보딩 설문", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("PHQ-9 + GAD-7 응답 후 survey_responses 행 생성", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/survey");
    await expect(page.getByText(/어디에서 가짜생각을/)).toBeVisible({ timeout: 15_000 });

    // ─── 인트로 4문항 ───
    await page.getByRole("button", { name: "인스타그램" }).click();
    await page.getByRole("button", { name: "우울 관리" }).click();
    await page.getByRole("button", { name: "여성" }).click();
    await page.getByRole("button", { name: "30대" }).click();

    // ─── PHQ-9 9문항 (모두 첫 번째 = 점수 3) ───
    for (let i = 0; i < 9; i++) {
      await page.getByRole("button", { name: /거의 매일/ }).first().click();
    }

    // ─── GAD-7 7문항 (모두 첫 번째 = 점수 3) ───
    for (let i = 0; i < 7; i++) {
      await page.getByRole("button", { name: /거의 매일/ }).first().click();
    }

    await expect(page.getByText("마음 상태 점검 결과")).toBeVisible();

    await page.getByRole("button", { name: "프로그램 시작하기" }).click();

    // dashboard로 리다이렉트 확인
    await page.waitForURL("**/dashboard", { timeout: 15_000 });

    // DB 검증
    const { data, error } = await admin
      .from("survey_responses")
      .select("*")
      .eq("user_id", user.id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.channel).toBe("인스타그램");
    expect(data!.gender).toBe("여성");
    expect(data!.age_group).toBe("30대");
    expect(data!.depression_score).toBe(27); // 9 * 3
    expect(data!.anxiety_score).toBe(21);    // 7 * 3
    expect(data!.recommended_track).toBe("depression"); // 27 - 21 = 6 > 2
    expect(data!.depression_severity).toBe("severe");
    expect(data!.anxiety_severity).toBe("severe");
  });

  test("F23 — 결과 페이지에 추천 플랜 카드 노출", async ({ page }) => {
    const u = await createTestUser();
    await loginAs(page, u);
    await page.goto("/survey");

    // 빠르게 끝까지 (점수 무관, 카드 노출만 확인)
    await page.getByRole("button", { name: "인스타그램" }).click();
    await page.getByRole("button", { name: "우울 관리" }).click();
    await page.getByRole("button", { name: "여성" }).click();
    await page.getByRole("button", { name: "30대" }).click();
    for (let i = 0; i < 9; i++) {
      await page.getByRole("button", { name: /거의 매일/ }).first().click();
    }
    for (let i = 0; i < 7; i++) {
      await page.getByRole("button", { name: /거의 매일/ }).first().click();
    }

    await expect(page.getByTestId("recommended-plan")).toBeVisible();
    await expect(page.getByTestId("recommended-plan")).toContainText("플랜");

    await deleteTestUser(u.id);
  });
});
