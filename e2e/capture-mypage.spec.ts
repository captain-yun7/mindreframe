import { test } from "@playwright/test";
import { createTestUser, deleteTestUser, loginAs } from "./helpers/auth";

/**
 * 네이버 검수용 마이페이지 캡처 — 닉네임/이메일 표시 화면.
 * 한 번만 실행해서 /tmp/mypage-naver-capture.png 생성.
 */
test("네이버 검수용 — 마이페이지 캡처", async ({ page }) => {
  // 마스킹 친화적인 닉네임/이메일로 사용자 생성
  const user = await createTestUser();

  // public.users에 닉네임 직접 셋업 + auth metadata도 동기화
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  await admin
    .from("users")
    .update({
      nickname: "가짜생각 사용자",
      email: "user@mindreframe.net",
      plan: "light",
    })
    .eq("id", user.id);
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { full_name: "가짜생각 사용자" },
  });

  await loginAs(page, user);
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/mypage");
  await page.waitForSelector('[data-testid="profile-email"]', { timeout: 15_000 });

  // 검수 캡처용 — DOM 텍스트만 자연스러운 값으로 교체 (DB 변경 아님)
  await page.evaluate(() => {
    const email = document.querySelector('[data-testid="profile-email"]');
    if (email) email.textContent = "user@mindreframe.net";
    const plan = document.querySelector('[data-testid="profile-plan"]');
    if (plan) plan.textContent = "light";
  });
  await page.waitForTimeout(300);

  await page.screenshot({
    path: "/tmp/mypage-naver-capture.png",
    fullPage: true,
  });

  await deleteTestUser(user.id);
});
