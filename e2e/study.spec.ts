import { test, expect } from "@playwright/test";

test.describe("/study 알고가기", () => {
  test("필수 8개 + 더 많이 4섹션 + 검색 + 상세 진입", async ({ page }) => {
    await page.goto("/study");
    await expect(page.getByRole("heading", { name: "알고가기", level: 1 })).toBeVisible();

    // 필수 섹션 + 첫 카드 노출
    await expect(page.getByRole("heading", { name: "필수", level: 2 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "초점을 이동하면 우울·불안이 완화될 수 있다" }),
    ).toBeVisible();

    // "더 많이 알고가기" 섹션 + 4개 그룹 제목 모두 노출
    await expect(
      page.getByRole("heading", { name: "더 많이 알고가기", level: 2 }),
    ).toBeVisible();
    for (const groupTitle of ["인지왜곡(통일 명칭)", "불안과 몸", "회피와 행동", "반추는 소의 되새김질"]) {
      await expect(page.getByText(groupTitle, { exact: false }).first()).toBeVisible();
    }

    // 검색: "회피" → 필수 카드는 사라지고 회피와 행동 그룹 펼침
    await page.getByRole("searchbox", { name: "알고가기 검색" }).fill("회피");
    await expect(
      page.getByRole("heading", { name: "초점을 이동하면 우울·불안이 완화될 수 있다" }),
    ).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "회피는 불안을 키운다" })).toBeVisible();

    // 검색 비우고 상세 진입
    await page.getByRole("searchbox", { name: "알고가기 검색" }).fill("");
    await page.getByRole("heading", { name: "초점을 이동하면 우울·불안이 완화될 수 있다" }).click();
    await page.waitForURL("**/study/core-1");
    await expect(
      page.getByRole("heading", { name: "초점을 이동하면 우울·불안이 완화될 수 있다", level: 1 }),
    ).toBeVisible();

    // 카테고리 뱃지: "필수"
    await expect(page.getByText("필수", { exact: true }).first()).toBeVisible();

    // 다음 글로 네비
    await page.getByRole("link", { name: /다음[\s\S]*왜 100일이 필요할까/ }).click();
    await page.waitForURL("**/study/core-2");
    await expect(
      page.getByRole("heading", { name: "왜 100일이 필요할까?", level: 1 }),
    ).toBeVisible();
  });

  test("존재하지 않는 slug → 404", async ({ page }) => {
    const resp = await page.goto("/study/nonexistent-slug");
    expect(resp?.status()).toBe(404);
  });
});
