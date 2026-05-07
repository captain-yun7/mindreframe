import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

/**
 * Plan 가드 — middleware의 PLAN_GATE_ENABLED ENV 켜진 상태 검증.
 */
test.describe("/pricing plan 게이팅", () => {
  let freeUser: TestUser;
  let proUser: TestUser;

  test.beforeAll(async () => {
    freeUser = await createTestUser("free");
    proUser = await createTestUser("pro");
  });

  test.afterAll(async () => {
    if (freeUser) await deleteTestUser(freeUser.id);
    if (proUser) await deleteTestUser(proUser.id);
  });

  test("free 사용자가 /exercise 접근 시 /pricing?required=pro 로 리다이렉트", async ({ page }) => {
    await loginAs(page, freeUser);
    await page.goto("/exercise");
    await page.waitForURL(/\/pricing\?.*required=pro/, { timeout: 10_000 });
    await expect(page.getByRole("alert").first()).toContainText("프로");
  });

  test("pro 사용자는 /exercise 정상 진입", async ({ page }) => {
    await loginAs(page, proUser);
    await page.goto("/exercise");
    await expect(page.getByRole("heading", { name: "행동연습장" })).toBeVisible();
  });

  test("/pricing 에 required 쿼리스트링 시 안내 배너 표시", async ({ page }) => {
    await loginAs(page, freeUser);
    await page.goto("/pricing?from=/exercise&required=pro");
    await expect(page.getByRole("alert").first()).toContainText("프로");
    await expect(page.getByRole("alert").first()).toContainText("이상 플랜");
  });
});
