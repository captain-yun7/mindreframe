import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("/coach F25 — 고객·상담사 채팅", () => {
  test("유저 발신 → 어드민 답변 → 유저 화면에 표시", async ({ browser }) => {
    // 유저(pro)와 상담사 2명 생성
    const user = await createTestUser("pro");
    const coach = await createTestUser("free");
    await admin.from("users").update({ role: "coach" }).eq("id", coach.id);

    try {
      // ── 유저 페이지: 세션 시작 + 메시지 전송 ──
      const userCtx = await browser.newContext();
      const userPage = await userCtx.newPage();
      await loginAs(userPage, user);
      await userPage.goto("/coach");
      await userPage.getByRole("button", { name: /코치와 새 대화 시작/ }).click();
      await userPage.getByPlaceholder(/메시지를 입력/).fill("안녕하세요, 코치님");
      await userPage.getByRole("button", { name: "전송" }).click();
      await expect(userPage.getByText("안녕하세요, 코치님")).toBeVisible({ timeout: 10_000 });

      // ── 어드민: 활성 세션 목록 진입 + 답변 ──
      const coachCtx = await browser.newContext();
      const coachPage = await coachCtx.newPage();
      await loginAs(coachPage, coach);
      await coachPage.goto("/admin/coach");
      await expect(coachPage.getByText(/활성 대화/)).toBeVisible();

      // 첫 활성 세션 클릭
      const sessionLink = coachPage.locator("a[href^='/admin/coach/']").first();
      await sessionLink.click();
      await coachPage.getByPlaceholder(/답변을 입력/).fill("네 어떤 점이 힘드신가요?");
      await coachPage.getByRole("button", { name: "답변 전송" }).click();
      await expect(coachPage.getByText("네 어떤 점이 힘드신가요?")).toBeVisible({
        timeout: 10_000,
      });

      // ── 유저 화면 새로고침 후 답변 확인 ──
      await userPage.reload();
      await expect(userPage.getByText("네 어떤 점이 힘드신가요?")).toBeVisible({
        timeout: 10_000,
      });

      await userCtx.close();
      await coachCtx.close();
    } finally {
      await deleteTestUser(user.id);
      await deleteTestUser(coach.id);
    }
  });

  test("coach 권한 없으면 /admin/coach 접근 차단", async ({ page }) => {
    const user = await createTestUser("pro");
    try {
      await loginAs(page, user);
      await page.goto("/admin/coach");
      await expect(page.getByText(/상담사 권한이 필요/)).toBeVisible();
    } finally {
      await deleteTestUser(user.id);
    }
  });
});
