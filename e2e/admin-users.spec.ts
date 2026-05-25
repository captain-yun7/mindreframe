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

/**
 * 시스템 잔여물 정리. soft-deleted 사용자는 auth는 이미 hard delete됐고
 * public.users만 남아있을 수 있으므로 직접 DB 정리.
 */
async function purgeUser(userId: string) {
  await admin.auth.admin.deleteUser(userId).catch(() => {});
  await admin.from("users").delete().eq("id", userId).then(() => {});
}

test.describe("Sprint D — F71 사용자 CRUD + ADMIN_BYPASS + F87", () => {
  test("ADMIN_BYPASS — admin이 onboarding 미완료여도 /admin 진입 가능", async ({
    page,
  }) => {
    const adminUser = await createTestUser();
    await admin
      .from("users")
      .update({
        role: "admin",
        nickname_set: false,
        onboarding_completed: false,
      })
      .eq("id", adminUser.id);
    try {
      await loginAs(page, adminUser);
      await page.goto("/admin");
      await expect(
        page.getByRole("heading", { name: "관리자 대시보드", level: 1 }),
      ).toBeVisible();
      // /dashboard도 가능 (admin은 모든 가드 면제)
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/dashboard/);
    } finally {
      await deleteTestUser(adminUser.id);
    }
  });

  test("ADMIN_BYPASS 회귀 — 일반 user는 여전히 닉네임 가드 적용", async ({
    page,
  }) => {
    const user = await createTestUser();
    await admin
      .from("users")
      .update({
        nickname_set: false,
        onboarding_completed: false,
      })
      .eq("id", user.id);
    try {
      await loginAs(page, user);
      await page.goto("/dashboard");
      await page.waitForURL(/\/onboarding\/nickname/);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("F71 — 사용자 생성 → 목록 노출 → 닉네임 수정 → 삭제", async ({
    page,
  }) => {
    const adminUser = await createAdminUser();
    let createdId: string | null = null;
    try {
      await loginAs(page, adminUser);

      // 1) 새 사용자 생성
      await page.goto("/admin/users/new");
      const tag = Date.now().toString(36);
      const email = `e2e+new${tag}@mindreframe.local`;
      const initialNick = `테스트${tag}`;
      await page.getByLabel("이메일").fill(email);
      await page.getByLabel("닉네임").first().fill(initialNick);
      await page.getByLabel("임시 비밀번호").fill("TestPass1234!");
      await page.getByLabel("플랜").selectOption("pro");
      await page.getByRole("button", { name: "사용자 생성" }).click();

      // 상세 페이지로 redirect
      await page.waitForURL(/\/admin\/users\/[0-9a-f-]+$/);
      createdId = page.url().split("/").pop()!;

      // 2) 닉네임 수정
      const updatedNick = `수정${tag}`;
      const nickInput = page.getByLabel("닉네임", { exact: true });
      await nickInput.fill(updatedNick);
      await page.getByRole("button", { name: "닉네임 변경" }).click();
      await expect(page.getByText("닉네임 변경 완료")).toBeVisible({
        timeout: 5000,
      });

      // 3) 목록에서 검색
      await page.goto(`/admin/users?q=${encodeURIComponent(updatedNick)}`);
      await expect(page.getByText(updatedNick).first()).toBeVisible();

      // 4) 상세로 가서 삭제
      await page.goto(`/admin/users/${createdId}`);
      await page.getByRole("button", { name: "사용자 삭제" }).click();
      await page.getByLabel("삭제 확인 닉네임").fill(updatedNick);
      await page.getByRole("button", { name: "삭제", exact: true }).click();
      await page.waitForURL(/\/admin\/users(\?|$)/);

      // 5) 목록에서 사라짐
      await page.goto(`/admin/users?q=${encodeURIComponent(updatedNick)}`);
      await expect(page.getByText("검색 결과 없음")).toBeVisible();
    } finally {
      if (createdId) await purgeUser(createdId);
      await deleteTestUser(adminUser.id);
    }
  });

  test("F71 — 본인 admin 계정은 위험 영역 카드가 보이지 않음 (서버 가드 + UI 가드)", async ({
    page,
  }) => {
    const adminUser = await createAdminUser();
    try {
      await loginAs(page, adminUser);
      await page.goto(`/admin/users/${adminUser.id}`);
      // 위험 영역 카드 자체가 렌더되지 않음 (본인 또는 admin)
      await expect(
        page.getByRole("button", { name: "사용자 삭제" }),
      ).toHaveCount(0);
    } finally {
      await deleteTestUser(adminUser.id);
    }
  });

  test("F71 — 비관리자 /admin/users/new 진입 시 / 로 리다이렉트", async ({
    page,
  }) => {
    const user = await createTestUser();
    try {
      await loginAs(page, user);
      await page.goto("/admin/users/new");
      await page.waitForURL("/");
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("F87 — pro 사용자 목록 진입 검증 (시간 조건은 실시간이라 약식)", async ({
    page,
  }) => {
    const adminUser = await createAdminUser();
    const target = await createTestUser("pro");
    try {
      await loginAs(page, adminUser);
      await page.goto(
        `/admin/users?q=${encodeURIComponent(target.email.split("@")[0])}`,
      );
      await expect(page.getByText(target.email)).toBeVisible();
    } finally {
      await deleteTestUser(target.id);
      await deleteTestUser(adminUser.id);
    }
  });

  test("admin이 /admin/coach 모니터링 진입 가능 (추가 발견)", async ({
    page,
  }) => {
    const adminUser = await createAdminUser();
    try {
      await loginAs(page, adminUser);
      await page.goto("/admin/coach");
      // 접근 권한 없음 페이지가 아니어야 함
      await expect(page.getByText("접근 권한 없음")).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: "상담사 어드민", level: 1 }),
      ).toBeVisible();
    } finally {
      await deleteTestUser(adminUser.id);
    }
  });
});
