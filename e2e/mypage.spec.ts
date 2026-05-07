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

  test("프로필 표시 + 닉네임 변경 + 로그아웃", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/mypage");

    await expect(page.getByRole("heading", { name: "마이페이지" })).toBeVisible();
    await expect(page.getByTestId("profile-email")).toContainText(user.email);
    await expect(page.getByTestId("profile-plan")).toContainText("premium");

    // 닉네임 변경
    await page.getByRole("button", { name: "변경" }).click();
    const newNick = "새닉네임_" + Date.now();
    await page.locator('input[type="text"]').fill(newNick);
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("닉네임이 변경되었습니다")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("profile-nickname")).toContainText(newNick);

    // 로그아웃 (마이페이지 카드 안의 버튼)
    await page.getByRole("main").getByRole("button", { name: "로그아웃" }).click();
    await page.waitForURL("**/login", { timeout: 10_000 });
  });
});
