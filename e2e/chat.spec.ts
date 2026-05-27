import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * /chat 가짜생각 분석기 — 5/27 원본 복원 + H2 finalize 카운팅 흐름.
 *
 * 4-phase state machine:
 *   1) analysis  → analyzeUserInput → 분석 카드 (situation/automatic_thought/emotion/distortions)
 *   2) selection → 인지왜곡 1개면 자동 진입 / 2개+이면 카드 노출
 *   3) therapy   → continueTherapy 누적 + 감정점수(0~100) 응답 시 awaitingEmotionAfter
 *   4) done      → 다음 응답에서 자동 finalize → chat_analyses.alternative_thought 채워짐
 *
 * OPENAI_API_KEY 미설정 시 자동 skip.
 */
test.describe("/chat 가짜생각 분석기 (원본 복원 흐름)", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    test.skip(!process.env.OPENAI_API_KEY, "OPENAI_API_KEY 미설정 — OpenAI 호출 필요");
    user = await createTestUser();
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("분석 → 인지왜곡 선택 → 치료 대화 → finalize → chat_analyses INSERT", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await loginAs(page, user);
    await page.goto("/chat");

    // hero 카피 + 1단계 라벨 노출
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/생각/);
    await expect(page.getByText(/1단계 · 분석/)).toBeVisible();

    // INITIAL_MESSAGE
    await expect(
      page.getByText(/어떤 일이 있었는지[\s\S]*감정을 0~100점/),
    ).toBeVisible();

    // ── phase 1: 분석 입력 ──
    const userMsg =
      "회의에서 발표를 해야 하는데, 떨려서 실수할 것 같고 사람들이 나를 이상하게 볼 것 같아요. 80점";
    await page.locator('input[type="text"]').fill(userMsg);
    await page.getByRole("button", { name: "전송" }).click();

    // 분석 카드 — "📊 분석 결과" + situation/automatic_thought/emotion 라인
    await expect(page.getByText(/📊 분석 결과/)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/상황:/)).toBeVisible();
    await expect(page.getByText(/자동사고:/)).toBeVisible();
    await expect(page.getByText(/감정:/)).toBeVisible();

    // chat_sessions row 생성 확인
    const { data: sessions } = await admin
      .from("chat_sessions")
      .select("id, status")
      .eq("user_id", user.id);
    expect(sessions?.length).toBeGreaterThan(0);
    const sessionId = sessions![0].id;

    // chat_analyses 임시 row (alternative_thought = null)
    const { data: pre } = await admin
      .from("chat_analyses")
      .select("id, alternative_thought, distortion_types")
      .eq("session_id", sessionId)
      .maybeSingle();
    expect(pre).toBeTruthy();
    expect(pre!.alternative_thought).toBeNull();
    expect(pre!.distortion_types?.length).toBeGreaterThan(0);

    // ── phase 2: 인지왜곡 1개 자동 진입 OR 2개+ 카드 노출 ──
    const distCount = pre!.distortion_types.length;
    if (distCount > 1) {
      // 2개+ → 선택 카드 (button role) 노출
      await expect(page.getByText(/2단계 · 왜곡 선택/)).toBeVisible({ timeout: 10_000 });
      const firstCard = page
        .locator("button")
        .filter({ hasText: new RegExp(`#${pre!.distortion_types[0]}`) })
        .first();
      await firstCard.click();
    }

    // ── phase 3: 치료 대화 ──
    await expect(page.getByText(/3단계 · 합리적 사고 만들기/)).toBeVisible({
      timeout: 60_000,
    });

    // 최대 8턴까지 대화 — assistant가 감정점수(후)를 물을 때까지
    let savedRow: { alternative_thought: string | null } | null = null;
    for (let turn = 0; turn < 8; turn++) {
      // 가장 최근 assistant 메시지 텍스트 추출 → 감정점수 요청 패턴 확인
      const lastAssistantText = await page
        .locator(".bg-white")
        .last()
        .innerText()
        .catch(() => "");

      const awaitingScore =
        /(감정|불안|강도)\s*(점수|몇\s*점|점)/.test(lastAssistantText) &&
        /(다시|재확인|마지막|지금)/.test(lastAssistantText);

      const reply = awaitingScore
        ? "30"
        : turn === 0
          ? "그래서 사실 그동안 발표를 잘 했던 적도 있는 것 같아요."
          : turn === 1
            ? "사람들이 의외로 응원해줬던 기억도 나요."
            : "합리적으로 보면 한 번의 발표가 전부를 결정하진 않아요.";

      await page.locator('input[type="text"]').fill(reply);
      await page.getByRole("button", { name: "전송" }).click();

      // 응답 대기
      await page.waitForTimeout(2000);

      // finalize 완료 후 done phase 도달했는지 확인
      const donePhase = await page
        .getByText(/정리 완료/)
        .isVisible()
        .catch(() => false);
      if (donePhase) {
        // chat_analyses row alternative_thought 채워졌는지 확인
        const { data: row } = await admin
          .from("chat_analyses")
          .select("alternative_thought, emotions")
          .eq("session_id", sessionId)
          .maybeSingle();
        savedRow = row;
        break;
      }

      // 다음 OpenAI 응답까지 잠시 대기
      await expect(page.locator('input[type="text"]')).toBeEnabled({
        timeout: 60_000,
      });
    }

    expect(savedRow).toBeTruthy();
    expect(savedRow!.alternative_thought).toBeTruthy();

    // chat_sessions.status = "summarized"
    const { data: sessAfter } = await admin
      .from("chat_sessions")
      .select("status")
      .eq("id", sessionId)
      .single();
    expect(sessAfter?.status).toBe("summarized");

    // H2: ai_usage feature='analyzer' row 1개 (finalize 1회 카운트)
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await admin
      .from("ai_usage")
      .select("count, feature")
      .eq("user_id", user.id)
      .eq("used_at", today)
      .eq("feature", "analyzer")
      .maybeSingle();
    if (usage) {
      expect(usage.count).toBe(1);
    }
  });

  test("11가지 인지왜곡 리스트 페이지 하단 노출 (F103)", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/chat");
    await expect(page.getByRole("heading", { name: "11가지 인지왜곡" })).toBeVisible();
  });
});
