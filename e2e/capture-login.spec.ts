import { test } from "@playwright/test";

test("네이버 검수용 — 로그인 페이지 캡처", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "/tmp/login-naver-capture.png",
    fullPage: true,
  });
});
