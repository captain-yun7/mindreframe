import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

test.describe("/mypage 마이페이지", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("로그인된 사용자 프로필 정보 표시 + 로그아웃", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/mypage");

    await expect(page.getByRole("heading", { name: "마이페이지" })).toBeVisible();
    await expect(page.getByTestId("profile-email")).toContainText(user.email);
    await expect(page.getByTestId("profile-plan")).toContainText("free");

    // 로그아웃 클릭 → /login 이동
    await page.getByRole("button", { name: "로그아웃" }).click();
    await page.waitForURL("**/login", { timeout: 10_000 });
  });
});
