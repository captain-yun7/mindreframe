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

  test("5필드 입력 + 쏟아내기 시 thought_records에 저장", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/trash");
    await expect(page.getByRole("heading", { name: "생각쓰레기통" })).toBeVisible();

    const inputs = {
      situation: "오늘 회의에서 발표를 망쳤다.",
      thought: "다들 나를 무시하는 것 같았다.",
      emotion: "불안 80, 무력감 60",
      bodyReaction: "가슴이 답답하고 손이 떨렸다.",
      behavior: "발표를 짧게 끝내고 자리에 앉았다.",
    };

    await page.locator("#field-situation").fill(inputs.situation);
    await page.locator("#field-thought").fill(inputs.thought);
    await page.locator("#field-emotion").fill(inputs.emotion);
    await page.locator("#field-bodyReaction").fill(inputs.bodyReaction);
    await page.locator("#field-behavior").fill(inputs.behavior);

    await page.getByRole("button", { name: "쏟아내기" }).click();

    // 저장 완료 메시지
    await expect(page.getByRole("status")).toContainText("잘 적어주셨어요", {
      timeout: 10_000,
    });

    // DB 검증 — 5필드가 분리 저장됐는지
    const { data, error } = await admin
      .from("thought_records")
      .select("*")
      .eq("user_id", user.id)
      .single();

    expect(error).toBeNull();
    expect(data!.situation).toBe(inputs.situation);
    expect(data!.thought).toBe(inputs.thought);
    expect(data!.emotion).toBe(inputs.emotion);
    expect(data!.body_reaction).toBe(inputs.bodyReaction);
    expect(data!.behavior).toBe(inputs.behavior);
  });
});
