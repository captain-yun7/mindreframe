import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("/exercise 행동연습장", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("용기있는 행동 모드 → 입력 + 저장 시 exercise_logs 생성", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/exercise");

    await page.getByRole("button", { name: /용기있는 행동/ }).click();

    const titleInput = page.locator('input[type="text"]').first();
    const noteInput = page.locator('input[type="text"]').nth(1);
    await titleInput.fill("5분 산책");
    await noteInput.fill("생각보다 괜찮았다");

    await page.getByRole("button", { name: "기록 저장" }).click();
    await expect(page.getByText("기록이 저장되었습니다")).toBeVisible({ timeout: 10_000 });

    const { data } = await admin
      .from("exercise_logs")
      .select("*")
      .eq("user_id", user.id)
      .single();
    expect(data!.exercise_key).toBe("courage");
    expect(data!.exercise_title).toBe("5분 산책");
    expect(data!.note).toBe("생각보다 괜찮았다");
  });
});
