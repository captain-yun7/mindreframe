import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("/chat 가짜생각 분석기", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("메시지 전송 → OpenAI 응답 + chat_sessions/messages 저장", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/chat");
    await expect(page.getByText("가짜생각 분석기 사용법")).toBeVisible();

    const userMsg = "회의에서 발표할 때 다들 나를 무시하는 것 같았어요. 감정: 불안 80점";
    await page.locator('input[type="text"]').fill(userMsg);
    await page.getByRole("button", { name: "전송" }).click();

    // assistant 응답 대기 (OpenAI 호출이라 타임아웃 길게)
    await expect(page.locator(".bg-white.border").last()).toBeVisible({ timeout: 30_000 });

    // 입력 중... 사라질 때까지 대기 (응답 완료)
    await expect(page.getByText("입력 중...")).toBeHidden({ timeout: 30_000 });

    // DB 검증
    const { data: sessions } = await admin
      .from("chat_sessions")
      .select("id")
      .eq("user_id", user.id);
    expect(sessions?.length).toBeGreaterThan(0);

    const { data: messages } = await admin
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessions![0].id)
      .order("created_at", { ascending: true });
    expect(messages?.length).toBeGreaterThanOrEqual(2);
    expect(messages![0].role).toBe("user");
    expect(messages![0].content).toBe(userMsg);
    expect(messages![1].role).toBe("assistant");
    expect(messages![1].content.length).toBeGreaterThan(10);
  });
});
