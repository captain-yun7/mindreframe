import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("위기 감지 안전망", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("/chat — 자살 키워드 입력 시 1393 안내 배너 + AI 호출 차단", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/chat");

    const dangerous = "요즘 너무 힘들어서 죽고싶어요";
    await page.locator('input[type="text"]').fill(dangerous);
    await page.getByRole("button", { name: "전송" }).click();

    // 안내 배너 노출 (클라이언트 즉시 감지)
    await expect(page.getByTestId("crisis-banner")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByTestId("crisis-banner").getByRole("link", { name: "1393" }),
    ).toBeVisible();

    // 입력 중... 사라질 때까지 대기 (서버 응답 완료)
    await expect(page.getByText("입력 중...")).toBeHidden({ timeout: 30_000 });

    // DB: assistant 메시지가 안내 메시지로 저장됐는지
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
    expect(messages![1].role).toBe("assistant");
    expect(messages![1].content).toContain("1393");
  });

  test("/trash — 자해 키워드 입력 시 안내 배너 노출", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/trash");

    const dangerous = "요즘 너무 힘들어서 자해하고 싶어요";
    await page.locator('input[type="text"]').fill(dangerous);
    await page.getByRole("button", { name: "전송" }).click();

    await expect(page.getByTestId("crisis-banner")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByTestId("crisis-banner").getByRole("link", { name: "1393" }),
    ).toBeVisible();
  });
});
