import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("/progress 나의성장방", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();

    // 시드 데이터: 감사일기 1, 명상 0, 분석 1 + 대안사고
    await admin.from("gratitude_entries").insert({
      user_id: user.id,
      content: "오늘 잘 견뎠다",
      recorded_at: new Date().toISOString().slice(0, 10),
    });

    // 분석 1건 + alternative_thought 포함
    const { data: session } = await admin
      .from("chat_sessions")
      .insert({ user_id: user.id, title: "테스트 세션" })
      .select("id")
      .single();
    if (session) {
      await admin.from("chat_analyses").insert({
        session_id: session.id,
        user_id: user.id,
        situation: "발표 망침",
        automatic_thought: "나는 무능하다",
        alternative_thought: "한 번의 실수가 나를 정의하지 않는다",
      });
    }
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("KPI + 대안사고 카드가 사용자 데이터를 반영", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/progress");
    await expect(page.getByRole("heading", { name: "나의성장방" })).toBeVisible();

    // KPI 검증
    await expect(page.getByTestId("kpi-분석 횟수")).toContainText("1회");
    await expect(page.getByTestId("kpi-대안사고")).toContainText("1개");

    // "첫 시작" 배지 획득 (analyses >= 1)
    const firstBadge = page.locator("text=첫 시작").first();
    await expect(firstBadge).toBeVisible();

    // 대안사고 카드에 실제 텍스트 노출
    await expect(page.getByText("한 번의 실수가 나를 정의하지 않는다")).toBeVisible();
  });
});
