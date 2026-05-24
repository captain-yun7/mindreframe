import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("F67 — onboarding 가드", () => {
  test("onboarding_completed=false 사용자가 /dashboard로 가면 /survey로 redirect", async ({ page }) => {
    const user = await createTestUser();
    // helpers/auth.ts가 기본으로 onboarding_completed=true를 박아주므로 강제로 false로 되돌림.
    // nickname_set=true 유지 (그래야 닉네임 가드는 통과하고 survey 가드만 검증)
    await admin
      .from("users")
      .update({ onboarding_completed: false })
      .eq("id", user.id);

    await loginAs(page, user);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/survey/);

    await deleteTestUser(user.id);
  });

  test("/survey 자체는 면제 경로로 통과", async ({ page }) => {
    const user = await createTestUser();
    await admin
      .from("users")
      .update({ onboarding_completed: false })
      .eq("id", user.id);
    await loginAs(page, user);
    await page.goto("/survey");
    await expect(page).toHaveURL(/\/survey/);
    await deleteTestUser(user.id);
  });
});
