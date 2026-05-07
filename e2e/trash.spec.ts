import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("/trash 생각쓰레기통 (챗봇 단계형)", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("5단계 챗 대화 → thought_records에 5필드 저장", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/trash");
    await expect(page.getByRole("heading", { name: "생각쓰레기통" })).toBeVisible();

    // 첫 질문 노출 확인
    await expect(page.getByText(/언제·어디서·누구와/)).toBeVisible();

    const inputs: Record<string, string> = {
      situation: "오늘 회의에서 발표를 망쳤다.",
      thought: "다들 나를 무시하는 것 같았다.",
      emotion: "불안 80, 무력감 60",
      bodyReaction: "가슴이 답답하고 손이 떨렸다.",
      behavior: "발표를 짧게 끝내고 자리에 앉았다.",
    };

    const send = async (text: string) => {
      await page.locator('input[type="text"]').fill(text);
      await page.getByRole("button", { name: "전송" }).click();
    };

    await send(inputs.situation);
    await expect(page.getByText(/머릿속에 가장 먼저 떠오른 생각/)).toBeVisible();
    await send(inputs.thought);
    await expect(page.getByText(/어떤 감정이 일어났나요/)).toBeVisible();
    await send(inputs.emotion);
    await expect(page.getByText(/몸으로 어떤 반응/)).toBeVisible();
    await send(inputs.bodyReaction);
    await expect(page.getByText(/그때 한 행동/)).toBeVisible();
    await send(inputs.behavior);

    // 정리 완료 메시지
    await expect(page.getByText(/정리 완료/)).toBeVisible({ timeout: 15_000 });

    // DB 검증
    const { data } = await admin
      .from("thought_records")
      .select("*")
      .eq("user_id", user.id)
      .single();

    expect(data!.situation).toBe(inputs.situation);
    expect(data!.thought).toBe(inputs.thought);
    expect(data!.emotion).toBe(inputs.emotion);
    expect(data!.body_reaction).toBe(inputs.bodyReaction);
    expect(data!.behavior).toBe(inputs.behavior);

    // 다시 시작 버튼
    await expect(page.getByRole("button", { name: "다른 사건 또 정리하기" })).toBeVisible();
  });
});
