import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * /exercise 행동연습장 — H5 풀 리뉴얼 흐름.
 *
 *   1단계: 불안/우울 모드 버튼 선택
 *   2단계: 표 작성 (불안 7컬럼 / 우울 5컬럼) — 1행 채우면 3단계 자동 unlock
 *   3단계: 라디오 선택 → 정보 카드 + 격려 + 4단계 펼치기 버튼
 *   4단계: 도전 기록 폼(did/before/after/learned) → 저장
 *   저장 시 CelebrationModal "용기 레벨 N 획득" 노출
 *   다른 메뉴 갔다 와도 진행 상태 복원 (exercise_state DB + localStorage)
 *
 * exercise_state 마이그 미적용 시 graceful skip.
 */
test.describe("/exercise 행동연습장 (H5 리뉴얼)", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    // exercise_state 마이그 가드
    const { error } = await admin.from("exercise_state").select("user_id").limit(1);
    if (error && /relation .* does not exist/.test(error.message)) {
      test.skip(true, `exercise_state 미적용: ${error.message}`);
    }
    user = await createTestUser("pro"); // /exercise는 pro 이상
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("불안 모드 → 표 1행 → 라디오 → 4단계 저장 → CelebrationModal + exercise_logs INSERT", async ({
    page,
  }) => {
    await loginAs(page, user);
    await page.goto("/exercise");

    // 1단계: 모드 선택 화면
    await expect(page.getByText(/1단계.*어떤 연습/)).toBeVisible();
    await page.getByRole("button", { name: /불안 줄이기 연습/ }).click();

    // 2단계: 불안 표 노출 — 첫 행 입력
    await expect(page.getByText(/2단계.*불안 목록 만들기/)).toBeVisible();
    const firstSituation = page.locator('input[data-k="situation"][data-row="0"]');
    await firstSituation.fill("회의에서 의견 말하기");
    // 자동 ws_draft localStorage 저장 + planSaved 자동 전환 트리거 (useEffect)
    await page.waitForTimeout(500);

    // 추가 입력 (불안점수·순위·자동사고·합리적사고) — 라디오 활성화 조건은 situation 채워지면 충분
    await page.locator('input[type="number"]').first().fill("60");

    // 3단계 자동 unlock — "3단계" 라벨 노출
    await expect(page.getByText(/3단계.*도전할 상황/)).toBeVisible({ timeout: 5_000 });

    // 라디오 클릭 (2단계 표 첫 행 라디오)
    await page.locator('input[type="radio"][name="anxRow"]').first().click();

    // 3단계에 선택된 상황 노출
    await expect(
      page.getByText(/상황 · 회의에서 의견 말하기/).first(),
    ).toBeVisible();

    // 4단계 펼치기 버튼
    await page.getByRole("button", { name: "4단계 펼치기" }).click();

    // 4단계: 도전 기록 폼
    await expect(page.getByText(/4단계.*도전 기록/)).toBeVisible();

    // 불안(실제) 전 / 후 — 4단계 폼 안의 number input들 (2단계 표 number 다음의 새로 노출된 input)
    const allNumInputs = page.locator('input[type="number"]');
    // 2단계 표의 첫 번호 input은 idx 0, 두번째는 순위 - 4단계 폼의 새로운 input은 마지막 2개
    const numCount = await allNumInputs.count();
    await allNumInputs.nth(numCount - 2).fill("70");
    await allNumInputs.nth(numCount - 1).fill("40");

    // 배운 점
    await page
      .locator('input[type="text"][placeholder*="생각만큼"]')
      .fill("막상 해보니 생각보다 괜찮았다");

    // 저장
    await page.getByRole("button", { name: /오늘 기록 저장/ }).click();

    // CelebrationModal — 용기 레벨 노출
    const celebrate = page.getByTestId("celebration-modal");
    await expect(celebrate).toBeVisible({ timeout: 10_000 });
    await expect(celebrate).toContainText(/용기 레벨/);

    // DB 검증 — exercise_logs row + note JSON
    const { data: logs } = await admin
      .from("exercise_logs")
      .select("exercise_key, exercise_title, note")
      .eq("user_id", user.id);
    expect(logs?.length).toBeGreaterThan(0);
    const log = logs![0];
    expect(log.exercise_key).toBe("anxiety");
    expect(log.exercise_title).toContain("회의에서 의견 말하기");
    const payload = JSON.parse(log.note);
    expect(payload.type).toBe("anxiety_exposure");
    expect(payload.mode).toBe("anxiety");
    expect(payload.situation).toBe("회의에서 의견 말하기");
    expect(payload.actualBefore).toBe(70);
    expect(payload.actualAfter).toBe(40);
    expect(payload.learnedLine).toContain("막상");
  });

  test("진행 상태 복원 — 다른 탭 다녀와도 mode + 표 hydrated", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/exercise");

    // 직전 테스트의 모드는 저장이 끝나면 step4Open=false로 reset되지만 exercise_state에 anx_plan 남아 있음
    // → 페이지 재진입 시 1단계가 아닌 mode 화면으로 복원 (mode != null)
    // 직접 fresh 상태로 테스트하기 위해 단순히 mode 선택 → 2단계 표 입력 → 다른 페이지 → 재진입 검증

    await page.goto("/exercise");
    // 만약 직전 저장으로 mode가 anxiety로 복원되어 있으면 그대로 진행. 아니면 새로 선택.
    const modeButton = page.getByRole("button", { name: /불안 줄이기 연습/ });
    if (await modeButton.isVisible().catch(() => false)) {
      await modeButton.click();
    }

    await expect(page.getByText(/2단계/)).toBeVisible();
    const sit = page.locator('input[data-k="situation"][data-row="1"]');
    await sit.fill("엘리베이터 안에서 인사하기");
    await page.waitForTimeout(800); // DB save debounce (600ms)

    // 다른 페이지 이동
    await page.goto("/dashboard");
    await page.waitForTimeout(500);

    // 재진입
    await page.goto("/exercise");

    // 2단계 화면 (mode 유지) — input 값 hydrated
    await expect(page.getByText(/2단계/)).toBeVisible();
    const restored = page.locator('input[data-k="situation"][data-row="1"]');
    await expect(restored).toHaveValue("엘리베이터 안에서 인사하기");
  });

  test("우울 모드 흐름 — 동일 패턴 1회 검증", async ({ page }) => {
    const depUser = await createTestUser("pro");
    try {
      await loginAs(page, depUser);
      await page.goto("/exercise");

      await page.getByRole("button", { name: /우울 벗어나기 연습/ }).click();
      await expect(page.getByText(/2단계.*활동 목록/)).toBeVisible();

      // 우울 표 첫 행 activity 채우기 — placeholder는 다르지만 첫 text input이 activity
      const firstActivity = page.locator('input[type="text"]').first();
      await firstActivity.fill("창문 열고 환기 5분");
      await page.waitForTimeout(500);

      // 3단계 자동 unlock
      await expect(page.getByText(/3단계.*활동/)).toBeVisible();

      await page.locator('input[type="radio"]').first().click();
      await page.getByRole("button", { name: "4단계 펼치기" }).click();

      // 4단계 폼 — afterMood(number) + learned(text)
      await page.locator('input[type="number"]').last().fill("60");
      await page
        .locator('input[type="text"][placeholder*="5분"]')
        .fill("5분이라도 하니까 조금 숨이 트였다");

      await page.getByRole("button", { name: /오늘 기록 저장/ }).click();

      const celebrate = page.getByRole("dialog").filter({ hasText: /용기 레벨/ });
      await expect(celebrate).toBeVisible({ timeout: 10_000 });

      // exercise_logs.exercise_key="depress" + note.type="depress_activity"
      const { data: logs } = await admin
        .from("exercise_logs")
        .select("exercise_key, note")
        .eq("user_id", depUser.id);
      expect(logs?.length).toBe(1);
      expect(logs![0].exercise_key).toBe("depress");
      const p = JSON.parse(logs![0].note);
      expect(p.type).toBe("depress_activity");
      expect(p.mode).toBe("depress");
    } finally {
      await deleteTestUser(depUser.id);
    }
  });
});
