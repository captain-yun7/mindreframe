import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const today = () => new Date().toISOString().slice(0, 10);

test.describe("/dashboard 오늘의 루틴", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("감사일기 저장 → gratitude_entries 행 생성", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "오늘의 루틴" })).toBeVisible();

    const text = "오늘 비록 힘들었지만 한 걸음 나아간 나에게 감사하다.";
    await page.locator("textarea").fill(text);
    await page.getByRole("button", { name: "감사일기 저장" }).click();

    await expect(page.getByText("감사일기가 저장되었습니다")).toBeVisible({ timeout: 10_000 });

    const { data } = await admin
      .from("gratitude_entries")
      .select("*")
      .eq("user_id", user.id)
      .single();
    expect(data!.content).toBe(text);
    expect(data!.recorded_at).toBe(today());
  });
});
