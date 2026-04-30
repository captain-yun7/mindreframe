import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("/trash 생각쓰레기통", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("메시지 전송 시 thought_records에 저장", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/trash");
    await expect(page.getByRole("heading", { name: "생각쓰레기통" })).toBeVisible();

    const situation = "오늘 회의에서 발표를 망쳤다. 사람들 앞에서 말이 안 나왔다.";
    await page.locator('input[type="text"]').fill(situation);
    await page.getByRole("button", { name: "전송" }).click();

    // 어시스턴트 응답 표시 (저장 성공 후)
    await expect(page.getByText("잘 적어주셨어요")).toBeVisible({ timeout: 10_000 });

    // DB 검증
    const { data, error } = await admin
      .from("thought_records")
      .select("*")
      .eq("user_id", user.id)
      .single();

    expect(error).toBeNull();
    expect(data!.situation).toBe(situation);
  });
});
