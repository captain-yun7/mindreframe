import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs, type TestUser } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test.describe("/progress 나의성장방", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser();

    // 시드 데이터: 감사일기 1, 명상 0, 분석 1 + 대안사고
    await admin.from("gratitude_entries").insert({
      user_id: user.id,
      content: "오늘 잘 견뎠다",
      recorded_at: new Date().toISOString().slice(0, 10),
    });

    // 분석 1건 + alternative_thought 포함
    const { data: session } = await admin
      .from("chat_sessions")
      .insert({ user_id: user.id, title: "테스트 세션" })
      .select("id")
      .single();
    if (session) {
      await admin.from("chat_analyses").insert({
        session_id: session.id,
        user_id: user.id,
        situation: "발표 망침",
        automatic_thought: "나는 무능하다",
        alternative_thought: "한 번의 실수가 나를 정의하지 않는다",
      });
    }

    // routine_checks: 오늘 + 어제 → streak 2 기대
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    await admin.from("routine_checks").insert([
      { user_id: user.id, item_key: "trash", week: 1, checked_at: fmt(today) },
      { user_id: user.id, item_key: "trash", week: 1, checked_at: fmt(yesterday) },
    ]);
  });

  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("KPI + 대안사고 카드가 사용자 데이터를 반영", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/progress");
    await expect(page.getByRole("heading", { name: "나의성장방" })).toBeVisible();

    // KPI 검증
    await expect(page.getByTestId("kpi-분석 횟수")).toContainText("1회");
    await expect(page.getByTestId("kpi-대안사고")).toContainText("1개");
    await expect(page.getByTestId("kpi-총 훈련일수")).toContainText("2일");
    await expect(page.getByTestId("kpi-연속 스트릭")).toContainText("2일");

    // "첫 시작" 배지 획득 (analyses >= 1)
    const firstBadge = page.locator("text=첫 시작").first();
    await expect(firstBadge).toBeVisible();

    // 대안사고 카드에 실제 텍스트 노출
    await expect(page.getByText("한 번의 실수가 나를 정의하지 않는다").first()).toBeVisible();

    // F8: 가짜생각 분석 기록 카드 (situation/automatic/alternative + distortion 태그)
    const analyses = page.getByTestId("recent-analyses");
    await expect(analyses).toContainText("발표 망침");
    await expect(analyses).toContainText("나는 무능하다");

    // F8: 감사일기 카드
    await expect(page.getByTestId("recent-gratitudes")).toContainText("오늘 잘 견뎠다");

    // F7: "대화 전체 보기" 클릭 → 모달 노출
    await page.getByRole("button", { name: /대화 전체 보기/ }).first().click();
    await expect(page.getByRole("dialog", { name: "대화 전체 보기" })).toBeVisible();
    // 닫기
    await page.getByRole("button", { name: "닫기" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("F8: 통합 카드 — 모든 카테고리 fallback 메시지 노출 (데이터 없을 때)", async ({ page }) => {
    // 새 사용자
    const fresh = await createTestUser();
    await loginAs(page, fresh);
    await page.goto("/progress");

    await expect(page.getByText("생각쓰레기통에 기록을 남기면")).toBeVisible();
    await expect(page.getByText("오늘의 루틴에서 감사일기를 저장하면")).toBeVisible();
    await expect(page.getByText("행동연습장에서 기록을 저장하면")).toBeVisible();
    await expect(page.getByText("명상 트랙을 재생/완료하면")).toBeVisible();

    await deleteTestUser(fresh.id);
  });

  test("F69 — 감사일기 5개 초과 시 더 보기 동작", async ({ page }) => {
    const fresh = await createTestUser();
    const today = new Date().toISOString().slice(0, 10);
    const baseTs = Date.now();
    // 7개 감사일기 시드 — 처음 5개 초기 + 더 보기로 +2 (총 7)
    // created_at을 1초씩 다르게 둬서 cursor 페이지네이션 안정화
    await admin.from("gratitude_entries").insert(
      Array.from({ length: 7 }, (_, i) => ({
        user_id: fresh.id,
        content: `감사 ${i + 1}`,
        recorded_at: today,
        // i=0이 가장 오래된 행, i=6이 가장 최신
        created_at: new Date(baseTs - (7 - i) * 1000).toISOString(),
      })),
    );

    await loginAs(page, fresh);
    await page.goto("/progress");

    // RPC가 created_at DESC LIMIT 5 → 처음 5개만 노출
    const items = page.locator('[data-testid="recent-gratitudes"] li');
    await expect(items).toHaveCount(5);

    // 더 보기 클릭 → 추가 2개 로드 → 총 7개
    await page.getByTestId("gratitude-load-more").click();
    await expect(items).toHaveCount(7);

    // 끝까지 갔으므로 버튼 사라짐
    await expect(page.getByTestId("gratitude-load-more")).toHaveCount(0);

    await deleteTestUser(fresh.id);
  });

  test("F69 — 감사일기 정확히 5개 보유 시 더 보기 클릭 후 버튼 숨김", async ({ page }) => {
    const fresh = await createTestUser();
    const today = new Date().toISOString().slice(0, 10);
    const baseTs = Date.now();
    await admin.from("gratitude_entries").insert(
      Array.from({ length: 5 }, (_, i) => ({
        user_id: fresh.id,
        content: `감사 ${i + 1}`,
        recorded_at: today,
        created_at: new Date(baseTs - (5 - i) * 1000).toISOString(),
      })),
    );

    await loginAs(page, fresh);
    await page.goto("/progress");

    const items = page.locator('[data-testid="recent-gratitudes"] li');
    await expect(items).toHaveCount(5);

    // 초기 5개 = "더 보기 가능성 있음"으로 버튼 노출. 클릭 → 빈 응답 → 숨김
    const loadMore = page.getByTestId("gratitude-load-more");
    if ((await loadMore.count()) > 0) {
      await loadMore.click();
      await expect(items).toHaveCount(5);
      await expect(loadMore).toHaveCount(0);
    }

    await deleteTestUser(fresh.id);
  });

  test("F70 — 감사일기 저장 후 /progress 즉시 반영 (revalidatePath)", async ({ page }) => {
    const fresh = await createTestUser();
    await loginAs(page, fresh);

    // dashboard에서 감사일기 저장
    await page.goto("/dashboard");
    const content = `즉시반영 테스트 ${Date.now().toString(36)}`;
    await page.locator("textarea").fill(content);
    await page.getByRole("button", { name: "감사일기 저장" }).click();
    await expect(page.getByText("감사일기가 저장되었습니다")).toBeVisible({
      timeout: 10_000,
    });

    // 바로 /progress 이동 — 캐시 무효화로 즉시 반영
    await page.goto("/progress");
    await expect(page.getByTestId("recent-gratitudes")).toContainText(content);

    await deleteTestUser(fresh.id);
  });
});
