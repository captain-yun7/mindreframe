import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("/meditation 명상하기", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("재생 → 정지 시 meditation_logs 생성", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/meditation");
    await expect(page.getByText("지금 어디에 초점을 맞추고 싶나요?")).toBeVisible();

    // 첫 번째 트랙 재생 버튼 클릭
    const playBtn = page.getByRole("button", { name: "재생" }).first();
    await playBtn.click();

    // 잠깐 기다린 후 정지 (=완료 기록 트리거)
    await page.waitForTimeout(800);
    const stopBtn = page.getByRole("button", { name: "정지" }).first();
    await stopBtn.click();

    await expect(page.getByText("명상 기록이 저장되었습니다")).toBeVisible({ timeout: 10_000 });

    const { data } = await admin
      .from("meditation_logs")
      .select("*")
      .eq("user_id", user.id)
      .single();
    expect(data).toBeTruthy();
    expect(data!.track_slug).toBeTruthy();
    expect(data!.track_title).toBeTruthy();
    expect(data!.duration).toBeGreaterThan(0);
  });
});
