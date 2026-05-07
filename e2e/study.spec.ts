import { test, expect } from "@playwright/test";

test.describe("/study 알고가기", () => {
  test("목록 표시 + 카테고리 필터 + 상세 진입", async ({ page }) => {
    await page.goto("/study");
    await expect(page.getByRole("heading", { name: "알고가기", level: 1 })).toBeVisible();

    // 6개 항목 모두 노출 (전체)
    await expect(page.getByText("기적의 100일 프로그램")).toBeVisible();
    await expect(page.getByText("자동사고란?")).toBeVisible();

    // "필수" 필터 → 100일 프로그램만
    await page.getByRole("button", { name: "필수" }).click();
    await expect(page.getByText("기적의 100일 프로그램")).toBeVisible();
    await expect(page.getByText("자동사고란?")).not.toBeVisible();

    // 상세 진입
    await page.getByText("기적의 100일 프로그램").click();
    await page.waitForURL("**/study/100days");
    await expect(page.getByRole("heading", { name: "기적의 100일 프로그램", level: 1 })).toBeVisible();

    // 영상 placeholder
    await expect(page.getByText("영상 콘텐츠 준비 중")).toBeVisible();
  });

  test("존재하지 않는 slug → 404", async ({ page }) => {
    const resp = await page.goto("/study/nonexistent-slug");
    expect(resp?.status()).toBe(404);
  });
});
