import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function createAdminUser() {
  const user = await createTestUser();
  await admin.from("users").update({ role: "admin" }).eq("id", user.id);
  return user;
}

test.describe("Sprint C — 어드민 콘텐츠 CRUD", () => {
  test("F89 — /admin/settings 진입 + footer_address 편집 비활성", async ({ page }) => {
    const adminUser = await createAdminUser();
    try {
      await loginAs(page, adminUser);
      await page.goto("/admin/settings");
      await expect(page.getByRole("heading", { name: "사이트 설정", level: 1 })).toBeVisible();
      // footer_address 행에 'Sprint C 보류' 라벨
      await expect(page.getByText("Sprint C 보류")).toBeVisible();
    } finally {
      await deleteTestUser(adminUser.id);
    }
  });

  test("F89 — 비관리자 /admin/settings 진입 시 / 로 리다이렉트", async ({ page }) => {
    const user = await createTestUser();
    try {
      await loginAs(page, user);
      await page.goto("/admin/settings");
      await page.waitForURL("/");
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("F86 — /admin/notifications/messages 진입", async ({ page }) => {
    const adminUser = await createAdminUser();
    try {
      await loginAs(page, adminUser);
      await page.goto("/admin/notifications/messages");
      await expect(page.getByRole("heading", { name: "알림 메시지 콘텐츠", level: 1 })).toBeVisible();
    } finally {
      await deleteTestUser(adminUser.id);
    }
  });

  test("F83 — /admin/meditations 목록 진입", async ({ page }) => {
    const adminUser = await createAdminUser();
    try {
      await loginAs(page, adminUser);
      await page.goto("/admin/meditations");
      await expect(page.getByRole("heading", { name: "명상 콘텐츠", level: 1 })).toBeVisible();
      // 새 트랙 등록 버튼 노출
      await expect(page.getByRole("link", { name: "+ 새 트랙" })).toBeVisible();
    } finally {
      await deleteTestUser(adminUser.id);
    }
  });

  test("F81 — /admin/study 목록 + /admin/study/videos 진입", async ({ page }) => {
    const adminUser = await createAdminUser();
    try {
      await loginAs(page, adminUser);
      await page.goto("/admin/study");
      await expect(page.getByRole("heading", { name: "알고가기 콘텐츠", level: 1 })).toBeVisible();
      await page.getByRole("link", { name: "100일 알림 영상" }).click();
      await expect(page.getByRole("heading", { name: "100일 알림 영상", level: 1 })).toBeVisible();
    } finally {
      await deleteTestUser(adminUser.id);
    }
  });

  test("F81 — 비관리자 /admin/study 진입 시 / 로 리다이렉트", async ({ page }) => {
    const user = await createTestUser();
    try {
      await loginAs(page, user);
      await page.goto("/admin/study");
      await page.waitForURL("/");
    } finally {
      await deleteTestUser(user.id);
    }
  });

  // F81 — 등록 → /study 즉시 노출 → 수정 → 변경 반영 → 삭제 → 사라짐
  // (plan에 명시되었던 CRUD 끝까지 가는 시나리오)
  test("F81 CRUD — 등록·수정·삭제 흐름이 /study에 즉시 반영", async ({ page }) => {
    const adminUser = await createAdminUser();
    const tag = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const slug = `e2e-${tag}`;
    const title1 = `E2E 테스트 글 ${tag}`;
    const title2 = `${title1} (수정됨)`;
    let createdId: string | null = null;

    try {
      await loginAs(page, adminUser);

      // [1] 등록
      await page.goto("/admin/study/new");
      await page.getByTestId("study-form-slug").fill(slug);
      await page.getByTestId("study-form-title").fill(title1);
      await page.getByTestId("study-form-sub").fill("e2e 부제");
      await page
        .getByTestId("study-form-body")
        .fill("<p>e2e 본문 — sprint c review</p>");
      await page.getByTestId("study-form-submit").click();
      await page.waitForURL("/admin/study");

      // DB로 id 회수 (정리·수정에 사용)
      const { data: created } = await admin
        .from("study_articles")
        .select("id")
        .eq("slug", slug)
        .single();
      expect(created?.id).toBeTruthy();
      createdId = created!.id as string;

      // [2] /study에 즉시 노출 — core 카테고리 기본값이므로 카드 셀렉터로 검증
      await page.goto("/study");
      await expect(page.getByTestId(`study-card-${slug}`)).toBeVisible();

      // [3] 상세 페이지 본문 확인 (dynamicParams=true로 신규 글 동적 생성)
      await page.goto(`/study/${slug}`);
      await expect(page.getByRole("heading", { name: title1, level: 1 })).toBeVisible();
      await expect(page.getByText("e2e 본문 — sprint c review")).toBeVisible();

      // [4] 수정 — title 변경
      await page.goto(`/admin/study/${createdId}/edit`);
      await page.getByTestId("study-form-title").fill(title2);
      await page.getByTestId("study-form-submit").click();
      await page.waitForURL("/admin/study");

      // 변경 반영
      await page.goto(`/study/${slug}`);
      await expect(page.getByRole("heading", { name: title2, level: 1 })).toBeVisible();

      // [5] 삭제
      await page.goto(`/admin/study/${createdId}/edit`);
      page.once("dialog", (d) => d.accept());
      await page.getByTestId("study-form-delete").click();
      await page.waitForURL("/admin/study");

      // /study에서 사라짐
      await page.goto("/study");
      await expect(page.getByTestId(`study-card-${slug}`)).toHaveCount(0);

      createdId = null; // 정리 불필요
    } finally {
      if (createdId) {
        await admin.from("study_articles").delete().eq("id", createdId);
      }
      await deleteTestUser(adminUser.id);
    }
  });
});
