import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("/signup 닉네임 익명 가입", () => {
  // anonymous sign-in이 비활성화된 경우는 자동으로 OAuth 안내 배너 노출만 검증.
  test("닉네임 입력 → /survey 이동 또는 OAuth 폴백", async ({ page }) => {
    const nickname = `테스트${Date.now().toString(36)}`;
    await page.goto("/signup");

    await page.locator('input[type="text"]').fill(nickname);
    await page.getByRole("button", { name: "바로 시작하기" }).click();

    // 두 가지 가능성 중 하나는 반드시 발생해야 함.
    const survey = page.waitForURL("**/survey", { timeout: 15_000 }).then(() => "survey" as const);
    const fallback = page
      .getByText("익명 가입을 사용할 수 없어요")
      .waitFor({ timeout: 15_000 })
      .then(() => "fallback" as const);

    const outcome = await Promise.race([survey, fallback]);

    if (outcome === "survey") {
      // public.users에 nickname이 저장됐는지 확인 (트리거 또는 server action)
      // anonymous user의 id는 cookie에서 알 수 없으므로 가장 최근 anon row를 찾는다.
      const { data: rows } = await admin
        .from("users")
        .select("id, nickname, provider, created_at")
        .eq("nickname", nickname)
        .order("created_at", { ascending: false })
        .limit(1);
      expect(rows?.length).toBe(1);
      expect(rows![0].nickname).toBe(nickname);

      // cleanup
      if (rows![0].id) {
        await admin.auth.admin.deleteUser(rows![0].id).catch(() => {});
      }
    } else {
      // anonymous sign-in이 꺼져 있으면 OAuth 폴백 배너가 보여야 함
      await expect(page.getByText("로그인 페이지로 이동")).toBeVisible();
    }
  });
});
