import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

/**
 * H4 — GamePopup 컴포넌트의 storageKey 기반 7일 dismissal.
 *
 *   - /trash 첫 진입 → "왜 생각을 나눌까요?" 등 팝업 노출
 *   - "1주간 안 보기" 클릭 → localStorage[storageKey] = Date.now()
 *   - 8일 후 다시 진입 → 재노출
 *   - /chat 분석기 팝업과 /trash 쓰레기통 팝업은 storageKey 독립
 */
test.describe("H4 GamePopup 7일 dismissal", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser("premium");
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("C1: /trash 첫 진입 시 GamePopup 노출", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/trash");

    // GamePopup은 setTimeout 350ms 후 노출
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test("C2: '1주간 안 보기' 클릭 → 새로고침 후 노출 X", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/trash");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /1주간 안 보기/ }).click();
    await expect(dialog).toBeHidden();

    // localStorage 값 검증
    const stored = await page.evaluate(() =>
      localStorage.getItem("popup_trash_intro_dismissed_at"),
    );
    expect(stored).toBeTruthy();
    expect(Number(stored)).toBeGreaterThan(Date.now() - 10_000);

    // 새로고침 후 다시 노출되지 않음
    await page.reload();
    await page.waitForTimeout(800); // 350ms 트리거 통과
    await expect(dialog).toBeHidden();
  });

  test("C3: 8일 전 timestamp로 덮어쓰면 다시 노출", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/trash");

    // 일단 한 번 dismiss
    const dialog = page.getByRole("dialog");
    if (await dialog.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /1주간 안 보기/ }).click();
    }

    // 8일 전 timestamp로 덮어쓰기
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    await page.evaluate((ts) => {
      localStorage.setItem("popup_trash_intro_dismissed_at", String(ts));
    }, eightDaysAgo);

    await page.reload();
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test("C4: storageKey 독립성 — /chat과 /trash는 별도 키", async ({ page }) => {
    await loginAs(page, user);

    // /trash 팝업 dismiss
    await page.goto("/trash");
    const trashDialog = page.getByRole("dialog");
    if (await trashDialog.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /1주간 안 보기/ }).click();
    }

    // /chat 으로 이동 → 분석기 팝업은 별도 키이므로 노출되어야 함
    await page.goto("/chat");
    const chatDialog = page.getByRole("dialog");
    // popup_chat_intro_dismissed_at가 비어있으면 노출
    const chatStored = await page.evaluate(() =>
      localStorage.getItem("popup_chat_intro_dismissed_at"),
    );
    if (!chatStored) {
      await expect(chatDialog).toBeVisible({ timeout: 5_000 });
    }

    // 두 키가 독립
    const trashKey = await page.evaluate(() =>
      localStorage.getItem("popup_trash_intro_dismissed_at"),
    );
    expect(trashKey).toBeTruthy();
  });
});
