import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * 5/27 원본 복원 review에서 보강한 "위기 응답 시 자동 저장 보류" 검증.
 *
 *   - /chat: 위기 키워드 입력 → chat_analyses.alternative_thought 채워지지 않음 + ai_usage 무차감
 *   - /trash: 위기 키워드 → thought_records INSERT 0건 + ai_usage 무차감
 *   - 1393 안내 (crisis-banner) 노출
 */
test.describe("위기 응답 시 자동 저장 보류", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("/chat: 위기 키워드 → chat_analyses 저장 보류 + ai_usage 무차감", async ({
    page,
  }) => {
    await loginAs(page, user);
    await page.goto("/chat");

    await page
      .locator('input[type="text"]')
      .fill("발표가 너무 두려워서 죽고싶어요");
    await page.getByRole("button", { name: "전송" }).click();

    // crisis-banner 노출 + 1393 안내
    await expect(page.getByTestId("crisis-banner")).toBeVisible({ timeout: 10_000 });

    // chat_analyses.alternative_thought IS NULL — finalize 실행 안 됨
    await page.waitForTimeout(3000);
    const { data: rows } = await admin
      .from("chat_analyses")
      .select("alternative_thought")
      .eq("user_id", user.id);
    // crisis 분기에서는 chat_analyses INSERT 자체가 발생하지 않음 (analyzeUserInput crisis 분기)
    // 또는 row가 있더라도 alternative_thought=null
    if (rows && rows.length > 0) {
      expect(rows.every((r) => r.alternative_thought === null)).toBe(true);
    }

    // ai_usage 차감 X
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await admin
      .from("ai_usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("used_at", today)
      .eq("feature", "analyzer")
      .maybeSingle();
    expect(usage?.count ?? 0).toBe(0);
  });

  test("/trash: 위기 키워드 → thought_records INSERT 0건 + ai_usage 무차감", async ({
    page,
  }) => {
    const u2 = await createTestUser();
    try {
      await loginAs(page, u2);
      await page.goto("/trash");

      await page
        .locator('input[type="text"]')
        .fill("자해하고 싶다는 생각이 자꾸 들어요");
      await page.getByRole("button", { name: "전송" }).click();

      // 1393 안내
      await expect(page.getByTestId("crisis-banner")).toBeVisible({
        timeout: 10_000,
      });

      // thought_records INSERT 0건
      await page.waitForTimeout(2000);
      const { data: records } = await admin
        .from("thought_records")
        .select("id")
        .eq("user_id", u2.id);
      expect(records?.length ?? 0).toBe(0);

      // ai_usage 차감 X
      const today = new Date().toISOString().slice(0, 10);
      const { data: usage } = await admin
        .from("ai_usage")
        .select("count")
        .eq("user_id", u2.id)
        .eq("used_at", today)
        .eq("feature", "trash")
        .maybeSingle();
      expect(usage?.count ?? 0).toBe(0);
    } finally {
      await deleteTestUser(u2.id);
    }
  });
});
