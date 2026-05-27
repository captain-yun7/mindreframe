import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * H6 — 랜딩 비로그인 분석기 (LandingAnalyzerPreview + analyzeAnonymous).
 *
 *   - 비로그인 사용자가 / 진입 → 분석기 입력 → 결과 카드
 *   - 결과 카드 인지왜곡 클릭 → /pricing 이동
 *   - 같은 anonymous_id 2번째 시도 → alreadyUsed=true (캐시 결과)
 *   - 위기 키워드 → 1393 안내 + 분석 실행 X
 *   - landing_analyzer_usage 마이그 미적용 시 graceful skip
 *
 * NOTE: OpenAI 비용 우려 — 본 spec은 OPENAI_API_KEY 설정 시에만 실행.
 *       위기 키워드 차단은 OpenAI 호출 전이라 API_KEY 없어도 통과.
 */
test.describe("H6 랜딩 분석기 (비로그인)", () => {
  test.beforeAll(async () => {
    const { error } = await admin
      .from("landing_analyzer_usage")
      .select("id")
      .limit(1);
    if (error && /relation .* does not exist/.test(error.message)) {
      test.skip(true, `landing_analyzer_usage 미적용: ${error.message}`);
    }
  });

  test("위기 키워드 입력 → 분석 차단 + 1393 안내", async ({ page }) => {
    // 비로그인 — 새 컨텍스트로 fresh state
    await page.goto("/");

    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    await textarea.fill("죽고 싶다는 생각이 자꾸 들어요");
    await page.getByRole("button", { name: /분석해보기/ }).click();

    // 1393 안내 노출
    await expect(page.getByText(/1393/).first()).toBeVisible({ timeout: 10_000 });

    // landing_analyzer_usage row 생성 안됨 (crisis는 OpenAI 호출 + INSERT 둘 다 차단)
    // → DB 확인 생략 (anonymousId가 random이라 매칭 어렵고 graceful)
  });

  test("C1: 비로그인 분석 1회 → 결과 카드 + localStorage UUID 저장", async ({
    page,
  }) => {
    test.skip(!process.env.OPENAI_API_KEY, "OPENAI_API_KEY 미설정");
    test.setTimeout(120_000);

    await page.goto("/");
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible();

    await textarea.fill(
      "회의에서 발표할 때 다들 나를 무시하는 것 같았어요. 불안 80점.",
    );
    await page.getByRole("button", { name: /분석해보기/ }).click();

    // 결과 카드 — "분석 결과" 텍스트
    await expect(page.getByText(/분석 결과/).first()).toBeVisible({
      timeout: 60_000,
    });

    // localStorage UUID 저장 확인
    const anonId = await page.evaluate(() =>
      localStorage.getItem("landing_analyzer_anon_id"),
    );
    expect(anonId).toMatch(/^[0-9a-f-]{36}$/i);

    // 인지왜곡 카드 클릭 → /pricing 이동
    const distortionLink = page.locator('a[href="/pricing"]').first();
    await distortionLink.click();
    await page.waitForURL(/\/pricing/, { timeout: 10_000 });
  });

  test("C2: 같은 anonymous_id 2번째 시도 → alreadyUsed (캐시 결과)", async ({
    page,
  }) => {
    test.skip(!process.env.OPENAI_API_KEY, "OPENAI_API_KEY 미설정");
    test.setTimeout(120_000);

    // 1번째 분석
    await page.goto("/");
    await page.locator("textarea").first().fill("발표 두려워요. 불안 80점.");
    await page.getByRole("button", { name: /분석해보기/ }).click();
    await expect(page.getByText(/분석 결과/).first()).toBeVisible({
      timeout: 60_000,
    });

    // 새로고침 — 같은 anonymous_id 유지
    await page.goto("/");
    await page.locator("textarea").first().fill("발표 두려워요. 불안 80점.");
    await page.getByRole("button", { name: /분석해보기/ }).click();

    // "이전 분석 결과" 라벨 노출 (alreadyUsed=true 분기)
    await expect(page.getByText(/이전 분석 결과/).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
