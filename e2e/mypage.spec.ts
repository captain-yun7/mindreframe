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

  test("프로필 표시 + 로그아웃 (F75: 닉네임 변경 불가)", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/mypage");

    await expect(page.getByRole("heading", { name: "마이페이지" })).toBeVisible();
    await expect(page.getByTestId("profile-email")).toContainText(user.email);
    await expect(page.getByTestId("profile-plan")).toContainText("premium");
    await expect(page.getByTestId("profile-nickname")).toBeVisible();

    // 닉네임 변경 UI가 마이페이지에 없어야 함
    await expect(
      page.getByRole("main").getByRole("button", { name: "변경" }),
    ).toHaveCount(0);

    // 로그아웃 (마이페이지 카드 안의 버튼)
    await page.getByRole("main").getByRole("button", { name: "로그아웃" }).click();
    await page.waitForURL("**/login", { timeout: 10_000 });
  });
});
