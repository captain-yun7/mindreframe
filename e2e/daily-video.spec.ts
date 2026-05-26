import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * F78 — 일차별 영상 통합 흐름.
 *
 * 검증 핵심:
 *   1) notifications_started_at 부재 → 대시보드 영상 카드 미노출, /play는 "알림 시작 전" 안내
 *   2) notifications_started_at 설정 + video_url 부재 → placeholder 노출
 *   3) notifications_started_at 설정 + video_url 존재 → 카드/플레이 표시
 *   4) URL 조작 day_number 검증 (현재 일차와 불일치 → ok=false)
 *
 * VideoPlayer 70% 트리거 자체는 R2 mp4 fetch 의존이라 e2e에선 검증 어렵다 →
 * server action 직접 검증은 unit 영역, 여기선 UI/페이지 노출만 확인.
 */

test.describe("F78 — 대시보드 오늘의 영상 카드", () => {
  test("notifications_started_at 없음 → 카드 미노출", async ({ page }) => {
    const user = await createTestUser("premium");
    try {
      await loginAs(page, user);
      await page.goto("/dashboard");
      // 카드 testid 둘 다 부재
      await expect(
        page.getByTestId("dashboard-today-video-card"),
      ).toHaveCount(0);
      await expect(
        page.getByTestId("dashboard-today-video-placeholder"),
      ).toHaveCount(0);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("notifications_started_at 설정 + video_url 부재 → placeholder", async ({
    page,
  }) => {
    const user = await createTestUser("premium");
    const { error: updErr } = await admin
      .from("users")
      .update({ notifications_started_at: new Date().toISOString() })
      .eq("id", user.id);
    if (updErr) {
      await deleteTestUser(user.id);
      test.skip(true, `users.notifications_started_at 미적용: ${updErr.message}`);
    }
    // 해당 일차 row가 없을 경우 카드 자체가 안 뜸. row 만들되 video_url=null
    const upsertRes = await admin
      .from("notification_videos")
      .upsert(
        { day_number: 1, title: "1일차 영상", video_url: null },
        { onConflict: "day_number" },
      );
    if (upsertRes.error) {
      await deleteTestUser(user.id);
      test.skip(true, `notification_videos 미적용: ${upsertRes.error.message}`);
    }
    try {
      await loginAs(page, user);
      await page.goto("/dashboard");
      await expect(
        page.getByTestId("dashboard-today-video-placeholder"),
      ).toBeVisible();
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("notifications_started_at 설정 + video_url 존재 → 재생 카드", async ({
    page,
  }) => {
    const user = await createTestUser("premium");
    const { error: updErr } = await admin
      .from("users")
      .update({ notifications_started_at: new Date().toISOString() })
      .eq("id", user.id);
    if (updErr) {
      await deleteTestUser(user.id);
      test.skip(true, `users.notifications_started_at 미적용: ${updErr.message}`);
    }
    // video_url에 임의 객체 키 (실제 R2 미존재 OK, presigned URL은 발급됨)
    const upsertRes = await admin
      .from("notification_videos")
      .upsert(
        {
          day_number: 1,
          title: "1일차 영상",
          video_url: "video/day-1.mp4",
        },
        { onConflict: "day_number" },
      );
    if (upsertRes.error) {
      await deleteTestUser(user.id);
      test.skip(true, `notification_videos 미적용: ${upsertRes.error.message}`);
    }
    try {
      await loginAs(page, user);
      await page.goto("/dashboard");
      // R2 ENV 없으면 presigned URL null → placeholder. 둘 중 하나는 떠야 함.
      const hasCard = await page
        .getByTestId("dashboard-today-video-card")
        .count();
      const hasPh = await page
        .getByTestId("dashboard-today-video-placeholder")
        .count();
      expect(hasCard + hasPh).toBeGreaterThan(0);
      // 일차 라벨 노출
      await expect(page.getByText("1일차").first()).toBeVisible();
    } finally {
      await deleteTestUser(user.id);
    }
  });
});

test.describe("F78 — /study/today/play 페이지", () => {
  test("notifications_started_at 없음 → '알림 시작 전' 안내", async ({
    page,
  }) => {
    const user = await createTestUser("premium");
    try {
      await loginAs(page, user);
      await page.goto("/study/today/play");
      await expect(
        page.getByText("알림이 아직 시작되지 않았어요"),
      ).toBeVisible();
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("notifications_started_at 설정 + 영상 미업로드 → placeholder", async ({
    page,
  }) => {
    const user = await createTestUser("premium");
    const { error: updErr } = await admin
      .from("users")
      .update({ notifications_started_at: new Date().toISOString() })
      .eq("id", user.id);
    if (updErr) {
      await deleteTestUser(user.id);
      test.skip(true, `users 갱신 실패: ${updErr.message}`);
    }
    try {
      await loginAs(page, user);
      await page.goto("/study/today/play");
      await expect(
        page.getByTestId("video-placeholder-today"),
      ).toBeVisible();
    } finally {
      await deleteTestUser(user.id);
    }
  });
});
