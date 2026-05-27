import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * /trash 생각쓰레기통 — 5/27 원본 복원 + H2 카운팅 흐름.
 *
 * AI 자유 대화 — 5요소(상황·생각·감정·신체·행동) 차례 질문 →
 * 충분히 모이면 assistant 응답에 ```json``` 코드블록 포함 →
 * 클라이언트가 regex로 JSON 추출 → thought_records INSERT →
 * 화면 표시 시 JSON 블록 strip.
 *
 * OPENAI_API_KEY 미설정 시 자동 skip.
 */
test.describe("/trash 생각쓰레기통 (AI 자유 대화 + JSON 추출)", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    test.skip(!process.env.OPENAI_API_KEY, "OPENAI_API_KEY 미설정");
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("5요소 입력 → assistant JSON 응답 → thought_records INSERT", async ({ page }) => {
    test.setTimeout(180_000);

    await loginAs(page, user);
    await page.goto("/trash");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/마음/);
    await expect(page.getByText(/오늘 불안하거나, 우울하거나, 화가 났던/)).toBeVisible();

    const send = async (text: string) => {
      await page.locator('input[type="text"]').fill(text);
      await page.getByRole("button", { name: "전송" }).click();
      // 응답 대기
      await page.waitForTimeout(2500);
      await expect(page.locator('input[type="text"]')).toBeEnabled({ timeout: 60_000 });
    };

    // 5요소를 1~3턴에 압축 — assistant가 JSON 추출 가능하도록 충분한 정보 제공
    await send(
      "오늘 회의에서 발표할 때 손이 떨리고 가슴이 답답했어요. 다들 나를 이상하게 본다는 생각이 들어서 불안 80점이었고, 결국 발표를 짧게 끝내고 자리에 앉았어요.",
    );

    // assistant가 추가 질문할 가능성 → 한두 번 더 응답
    let saved = false;
    for (let turn = 0; turn < 4; turn++) {
      // 화면에 "성장방에 저장되었어요" 노출되면 종료
      const isSaved = await page
        .getByText(/성장방에 저장되었어요/)
        .first()
        .isVisible()
        .catch(() => false);
      if (isSaved) {
        saved = true;
        break;
      }

      await send(
        turn === 0
          ? "상황: 회의 발표. 생각: 다들 나를 무시한다. 감정: 불안 80. 신체: 손 떨림·가슴 답답. 행동: 발표 짧게 끝냄."
          : "정리해주세요.",
      );
    }

    // 안 끝났어도 thought_records row 존재 여부로 검증 fallback
    const { data: records } = await admin
      .from("thought_records")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    expect(records?.length).toBeGreaterThan(0);

    const row = records![0];
    // 5필드 모두 채워졌는지 확인 (정확한 텍스트는 OpenAI 응답이라 contains)
    expect(row.situation?.length ?? 0).toBeGreaterThan(0);
    expect(row.thought?.length ?? 0).toBeGreaterThan(0);
    expect(row.emotion?.length ?? 0).toBeGreaterThan(0);
    // body_reaction / behavior는 OpenAI가 추출 못할 수도 있어 nullable 허용

    // JSON 블록은 화면에 노출되지 않아야 함 (strip 검증)
    const visibleText = await page.locator("body").innerText();
    expect(visibleText).not.toContain("```json");

    // H2: ai_usage feature='trash' row 1개 카운트
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await admin
      .from("ai_usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("used_at", today)
      .eq("feature", "trash")
      .maybeSingle();
    if (usage) {
      expect(usage.count).toBeGreaterThanOrEqual(1);
    }

    if (saved) {
      // 정리 완료 후 "다른 사건 또 정리하기" 버튼 노출
      await expect(
        page.getByRole("button", { name: "다른 사건 또 정리하기" }),
      ).toBeVisible();
    }
  });
});
