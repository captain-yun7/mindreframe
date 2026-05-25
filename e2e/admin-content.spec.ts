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
});
