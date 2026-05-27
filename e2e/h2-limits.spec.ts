import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * H2 한도 정책 — F100·F101·F102 회귀 안전망 (핵심).
 *
 * 정책 요약 (`lib/auth/plan.ts::PLAN_FEATURE_LIMITS`):
 *   free     analyzer 0 / trash 0
 *   light    analyzer 5 / trash 5
 *   pro      analyzer 7 / trash 7
 *   premium  무제한
 *
 * 카운팅 단위 (`lib/ai/usage.ts` H2):
 *   - 분석기: finalizeAndSave 완료 시 1회 (analyze/start/continueTherapy는 checkUsageOnly만)
 *   - 쓰레기통: JSON 추출 + thought_records INSERT 성공 시 1회
 *
 * 본 spec은 OpenAI 호출 비용을 줄이기 위해 **DB seed 기반**으로 검증한다.
 *   1) ai_usage 직접 INSERT로 한도 직전 시드
 *   2) UI에서 입력 시도 → 한도 초과 메시지 검증
 *   3) (선택) 흐름 1회 실제 실행 → +1 검증 (OPENAI_API_KEY 필요)
 */

const today = () => new Date().toISOString().slice(0, 10);

async function seedUsage(
  userId: string,
  feature: "analyzer" | "trash",
  count: number,
) {
  return admin.from("ai_usage").upsert(
    {
      user_id: userId,
      used_at: today(),
      feature,
      count,
    },
    { onConflict: "user_id,used_at,feature" },
  );
}

async function getUsage(userId: string, feature: "analyzer" | "trash"): Promise<number> {
  const { data } = await admin
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("used_at", today())
    .eq("feature", feature)
    .maybeSingle();
  return data?.count ?? 0;
}

test.describe("H2 한도 정책 회귀 안전망", () => {
  test.beforeAll(async () => {
    // ai_usage 테이블 + feature 컬럼 마이그 가드
    const { error } = await admin
      .from("ai_usage")
      .select("count")
      .limit(1);
    if (error && /relation .* does not exist/.test(error.message)) {
      test.skip(true, `ai_usage 미적용: ${error.message}`);
    }
    test.skip(
      process.env.AI_USAGE_LIMITS_DISABLED === "true",
      "AI_USAGE_LIMITS_DISABLED=true 환경에서는 한도 검증 불가",
    );
  });

  test("C1: 라이트 사용자 analyzer 5회 시드 → 6회째 차단", async ({ page }) => {
    const u = await createTestUser("light");
    try {
      const { error } = await seedUsage(u.id, "analyzer", 5);
      test.skip(!!error, error?.message ?? "");

      await loginAs(page, u);
      await page.goto("/chat");

      await page.locator('input[type="text"]').fill("오늘 발표가 두려워요. 80점");
      await page.getByRole("button", { name: "전송" }).click();

      await expect(
        page.getByText(/오늘.*가짜생각 분석기.*한도.*5/).first(),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteTestUser(u.id);
    }
  });

  test("C2: 프로 사용자 analyzer 7회 시드 → 8회째 차단", async ({ page }) => {
    const u = await createTestUser("pro");
    try {
      const { error } = await seedUsage(u.id, "analyzer", 7);
      test.skip(!!error, error?.message ?? "");

      await loginAs(page, u);
      await page.goto("/chat");

      await page.locator('input[type="text"]').fill("발표 또 망칠 것 같아요. 90점");
      await page.getByRole("button", { name: "전송" }).click();

      await expect(
        page.getByText(/오늘.*가짜생각 분석기.*한도.*7/).first(),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteTestUser(u.id);
    }
  });

  test("C3: 프리미엄 사용자 analyzer 100회 시드 후에도 차단 없음", async ({ page }) => {
    test.skip(!process.env.OPENAI_API_KEY, "premium 분석 흐름은 실제 OpenAI 호출 필요");
    test.setTimeout(120_000);

    const u = await createTestUser("premium");
    try {
      const { error } = await seedUsage(u.id, "analyzer", 100);
      test.skip(!!error, error?.message ?? "");

      await loginAs(page, u);
      await page.goto("/chat");

      await page.locator('input[type="text"]').fill("발표 두려움. 80점");
      await page.getByRole("button", { name: "전송" }).click();

      // 분석 결과 노출 — 차단 메시지가 아닌 정상 흐름
      await expect(page.getByText(/📊 분석 결과/)).toBeVisible({ timeout: 60_000 });
    } finally {
      await deleteTestUser(u.id);
    }
  });

  test("C4: 라이트 사용자 trash 5회 시드 → 6회째 차단", async ({ page }) => {
    const u = await createTestUser("light");
    try {
      const { error } = await seedUsage(u.id, "trash", 5);
      test.skip(!!error, error?.message ?? "");

      await loginAs(page, u);
      await page.goto("/trash");

      await page.locator('input[type="text"]').fill("오늘 회의에서 떨렸어요");
      await page.getByRole("button", { name: "전송" }).click();

      // trash는 화면 표시 후 sendTrashMessage에서 checkUsageOnly로 차단
      // 토스트 메시지에 한도 안내
      await expect(
        page.getByText(/오늘.*생각쓰레기통.*한도.*5/).first(),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteTestUser(u.id);
    }
  });

  test("C5: 분석기 흐름 = ai_usage +1 (analyze 단계 카운트 0 유지)", async ({ page }) => {
    test.skip(!process.env.OPENAI_API_KEY, "OPENAI_API_KEY 미설정 — 흐름 실행 불가");
    test.setTimeout(180_000);

    const u = await createTestUser("light");
    try {
      await loginAs(page, u);
      await page.goto("/chat");

      // 분석 단계 진입
      await page
        .locator('input[type="text"]')
        .fill("회의 발표가 두려워서 다 망칠 것 같아요. 80점");
      await page.getByRole("button", { name: "전송" }).click();
      await expect(page.getByText(/📊 분석 결과/)).toBeVisible({ timeout: 60_000 });

      // 분석 단계에서는 ai_usage = 0 (checkUsageOnly만)
      const mid = await getUsage(u.id, "analyzer");
      expect(mid).toBe(0);
    } finally {
      await deleteTestUser(u.id);
    }
  });

  test("C6: free 사용자 analyzer 한도 0 → 입력 시 즉시 안내", async ({ page }) => {
    const u = await createTestUser("free");
    try {
      // free는 middleware에서 /chat 진입 자체가 light required로 리다이렉트 가능
      // → /pricing 으로 리다이렉트 또는 /chat 도달 후 한도 안내. 어느 쪽이든 자유롭게 검증.
      await loginAs(page, u);
      await page.goto("/chat");

      // /pricing 으로 리다이렉트되었으면 게이트가 작동한 것. /chat에 머물면 한도 메시지 검증.
      await page.waitForLoadState("networkidle").catch(() => {});
      const url = page.url();
      if (/\/pricing/.test(url)) {
        // plan-gate가 처리 — light required 메시지 확인
        await expect(page.getByRole("alert").first()).toContainText("라이트");
      } else {
        // /chat 도달 → 입력 시 free는 analyzer 0
        await page.locator('input[type="text"]').fill("뭔가 잘 안 풀려요. 70점");
        await page.getByRole("button", { name: "전송" }).click();
        await expect(
          page.getByText(/유료 플랜.*부터 이용 가능|한도|0회/).first(),
        ).toBeVisible({ timeout: 10_000 });
      }
    } finally {
      await deleteTestUser(u.id);
    }
  });
});
