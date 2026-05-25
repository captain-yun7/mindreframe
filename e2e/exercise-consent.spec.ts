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
 * users.allow_coach_view_exercise 컬럼 부재(마이그 미적용) 여부 확인.
 * 부재 시 본 describe 전체 skip.
 */
async function isMigrationApplied(): Promise<boolean> {
  const { error } = await admin
    .from("users")
    .select("allow_coach_view_exercise")
    .limit(1);
  if (error) {
    return !(
      (error as { code?: string }).code === "42703" ||
      /allow_coach_view_exercise/.test(error.message)
    );
  }
  return true;
}

test.describe("F82 — 행동연습장 열람 동의", () => {
  test("사용자가 마이페이지에서 토글 ON → DB allow_coach_view_exercise=true", async ({
    page,
  }) => {
    test.skip(
      !(await isMigrationApplied()),
      "allow_coach_view_exercise 컬럼 부재 (마이그 미적용)",
    );

    const user = await createTestUser("pro");
    try {
      await loginAs(page, user);
      await page.goto("/mypage");

      const toggle = page.getByTestId("coach-view-consent-toggle");
      await expect(toggle).toBeVisible();
      // 초기 상태 — 허용 안 함
      await expect(toggle).toHaveAttribute("aria-pressed", "false");

      // 토글 클릭 → ON
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "true");

      // DB 검증
      const { data } = await admin
        .from("users")
        .select("allow_coach_view_exercise")
        .eq("id", user.id)
        .single();
      expect(
        (data as { allow_coach_view_exercise: boolean }).allow_coach_view_exercise,
      ).toBe(true);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("admin이 /admin/users/[id]에서 동의 사용자의 행동연습장 카드 → 보기 페이지 진입", async ({
    page,
  }) => {
    test.skip(
      !(await isMigrationApplied()),
      "allow_coach_view_exercise 컬럼 부재 (마이그 미적용)",
    );

    const adminUser = await createAdminUser();
    const target = await createTestUser("pro");
    await admin
      .from("users")
      .update({ allow_coach_view_exercise: true })
      .eq("id", target.id);

    try {
      await loginAs(page, adminUser);
      await page.goto(`/admin/users/${target.id}`);

      // 행동연습장 카드에 '기록 보기' 링크 노출
      const link = page.getByRole("link", { name: "행동연습장 기록 보기" });
      await expect(link).toBeVisible();
      await link.click();

      // 보기 페이지 진입
      await page.waitForURL(/\/admin\/users\/[0-9a-f-]+\/exercise-logs/);
      await expect(
        page.getByRole("heading", { name: "행동연습장 기록" }),
      ).toBeVisible();
    } finally {
      await deleteTestUser(target.id);
      await deleteTestUser(adminUser.id);
    }
  });

  test("동의 안 한 사용자 → admin 페이지에서 '허용하지 않음' 안내", async ({
    page,
  }) => {
    test.skip(
      !(await isMigrationApplied()),
      "allow_coach_view_exercise 컬럼 부재 (마이그 미적용)",
    );

    const adminUser = await createAdminUser();
    const target = await createTestUser("pro");
    // 명시적 false (createTestUser default가 false지만 명확화)
    await admin
      .from("users")
      .update({ allow_coach_view_exercise: false })
      .eq("id", target.id);

    try {
      await loginAs(page, adminUser);
      await page.goto(`/admin/users/${target.id}`);

      await expect(
        page.getByText("사용자가 열람을 허용하지 않았어요"),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "행동연습장 기록 보기" }),
      ).toHaveCount(0);
    } finally {
      await deleteTestUser(target.id);
      await deleteTestUser(adminUser.id);
    }
  });
});
