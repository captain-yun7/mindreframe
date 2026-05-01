import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * Plan 가드 — middleware의 PLAN_GATE_ENABLED ENV에 의존.
 * 베타 기간엔 false (모두 허용)이므로 ENV가 false인 상태에서 통과 검증만 한다.
 *
 * ENV가 true인 케이스는 정식 출시 직전 별도 검증.
 */
test.describe("/pricing plan 게이팅", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("free 사용자도 베타 기간엔 /exercise 진입 가능 (PLAN_GATE_ENABLED=false)", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/exercise");

    // 베타: 정상 노출
    await expect(page.getByRole("heading", { name: "행동연습장" })).toBeVisible();
  });

  test("/pricing 에 required 쿼리스트링 시 안내 배너 표시", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/pricing?from=/exercise&required=pro");

    await expect(page.getByRole("alert")).toContainText("프로");
    await expect(page.getByRole("alert")).toContainText("이상 플랜");
  });
});
