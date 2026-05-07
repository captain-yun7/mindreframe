import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("/exercise 행동연습장 (계획·실행·회고)", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("3단 입력 → exercise_logs.note에 JSON 저장 + /progress에 구조화 표시", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/exercise");

    await page.getByRole("button", { name: /용기있는 행동/ }).click();

    // ① 계획
    await page.getByTestId("plan-what").fill("5분 산책");
    await page.locator('input[placeholder*="오후 2시"]').fill("점심 먹고 2시쯤");
    await page.locator('input[placeholder*="공원"]').fill("집 앞 공원, 혼자");

    // ② 실행
    await page.getByRole("button", { name: "✓ 했어요" }).click();
    await page.locator('input[type="number"]').first().fill("70");
    await page.locator('input[type="number"]').nth(1).fill("40");

    // ③ 회고
    await page.locator("textarea").fill("막상 해보니 생각보다 괜찮았다");

    await page.getByRole("button", { name: "기록 저장" }).click();
    await expect(page.getByText("기록이 저장되었습니다")).toBeVisible({ timeout: 10_000 });

    // DB — note에 JSON
    const { data } = await admin
      .from("exercise_logs")
      .select("*")
      .eq("user_id", user.id)
      .single();
    expect(data!.exercise_key).toBe("courage");
    expect(data!.exercise_title).toBe("5분 산책");
    const payload = JSON.parse(data!.note);
    expect(payload.plan.what).toBe("5분 산책");
    expect(payload.plan.when).toBe("점심 먹고 2시쯤");
    expect(payload.execution.did).toBe(true);
    expect(payload.execution.before).toBe(70);
    expect(payload.execution.after).toBe(40);
    expect(payload.reflection).toBe("막상 해보니 생각보다 괜찮았다");

    // /progress에 구조화 표시
    await page.goto("/progress");
    const exerciseCard = page.getByTestId("recent-exercises");
    await expect(exerciseCard).toContainText("5분 산책");
    await expect(exerciseCard).toContainText("점심 먹고 2시쯤");
    await expect(exerciseCard).toContainText("기분 70 → 40");
    await expect(exerciseCard).toContainText("막상 해보니 생각보다 괜찮았다");
  });
});
