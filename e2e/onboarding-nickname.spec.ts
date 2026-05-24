import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("F75 — 닉네임 1회 입력", () => {
  test("nickname_set=false 사용자가 /dashboard 가면 /onboarding/nickname으로 redirect", async ({ page }) => {
    const user = await createTestUser();
    await admin.from("users").update({ nickname_set: false }).eq("id", user.id);

    await loginAs(page, user);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/onboarding\/nickname/);
    await deleteTestUser(user.id);
  });

  test("닉네임 저장 후 /survey로 이동 + 재진입 시 우회", async ({ page }) => {
    const user = await createTestUser();
    await admin
      .from("users")
      .update({ nickname_set: false, onboarding_completed: false })
      .eq("id", user.id);
    await loginAs(page, user);

    await page.goto("/onboarding/nickname");
    await page.getByTestId("nickname-input").fill("새벽별");
    await page.getByTestId("nickname-submit").click();
    await expect(page).toHaveURL(/\/survey/);

    const { data } = await admin
      .from("users")
      .select("nickname, nickname_set")
      .eq("id", user.id)
      .single();
    expect(data?.nickname).toBe("새벽별");
    expect(data?.nickname_set).toBe(true);

    // 이미 설정 완료 → /onboarding/nickname 직접 진입해도 다음 단계로 흘러야 함
    await page.goto("/onboarding/nickname");
    await expect(page).not.toHaveURL(/\/onboarding\/nickname/);

    await deleteTestUser(user.id);
  });

  test("마이페이지 닉네임 변경 UI 노출 안 됨", async ({ page }) => {
    const user = await createTestUser();
    await loginAs(page, user);
    await page.goto("/mypage");
    const main = page.getByRole("main");
    await expect(main.getByRole("button", { name: "변경" })).toHaveCount(0);
    await expect(page.getByTestId("profile-nickname")).toBeVisible();
    await deleteTestUser(user.id);
  });
});
