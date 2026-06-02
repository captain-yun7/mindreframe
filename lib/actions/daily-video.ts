"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getVideoUrl } from "@/lib/video/r2-video";
import { computeDayNumber } from "@/lib/coach/day-number";
import { todayKst, isoWeekKst } from "@/lib/dates";

/**
 * F78 — 사용자가 영상 70% 도달 시 호출.
 * routine_checks(item_key='daily_video', checked_at=오늘 KST) upsert.
 * UNIQUE (user_id, item_key, checked_at) 제약으로 1일 1회만 카운트.
 *
 * 보안: 사용자가 URL/페이로드 조작으로 임의 dayNumber를 보낼 경우,
 * 자기 notifications_started_at 기반으로 재계산한 일차와 일치하는지 검증.
 */
export async function logDailyVideoWatch(dayNumber: number) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 100) {
    return { ok: false as const, error: "day_number는 1~100" };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("notifications_started_at")
    .eq("id", user.id)
    .single();
  const startedAt =
    (profile as { notifications_started_at?: string | null } | null)
      ?.notifications_started_at ?? null;
  // F252 — 알림 시작 사용자는 startedAt 기준, 미시작은 가입일(created_at) 경과일 기준.
  // 위변조 방지 — myDay와 일치해야만 카운트.
  const myDay =
    computeDayNumber(startedAt) ?? computeDayNumber(user.created_at) ?? 1;
  if (myDay !== dayNumber) {
    return {
      ok: false as const,
      error: "현재 일차와 일치하지 않습니다",
    };
  }

  const { error } = await supabase.from("routine_checks").upsert(
    {
      user_id: user.id,
      item_key: "daily_video",
      week: isoWeekKst(),
      checked_at: todayKst(),
    },
    { onConflict: "user_id,item_key,checked_at", ignoreDuplicates: true },
  );
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/progress");
  return { ok: true as const };
}

export type TodayDailyVideo =
  | {
      ok: true;
      dayNumber: number;
      title: string;
      videoUrl: string | null;
      durationSeconds: number | null;
    }
  | { ok: false; reason: "no_user" }
  | { ok: false; reason: "no_row"; dayNumber: number };

/**
 * 대시보드 / 영상 페이지에서 N일차 영상 메타 fetch.
 *
 * F217 — 알림 시작 안 한 사용자도 영상은 자유 재생. notifications_started_at NULL이면 day 1로 fallback.
 * - 미로그인 → reason="no_user"
 * - 해당 일차 row 미존재 → reason="no_row"
 * - row 있으면 video_url(객체 키) → R2 GET presigned URL 발급. 객체 키 없으면 videoUrl=null.
 *
 * video_url 컬럼 미적용 환경 fallback: `42703` 코드 catch → 컬럼 없이 select 재시도.
 */
export async function getTodayDailyVideo(): Promise<TodayDailyVideo> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "no_user" };

  const { data: profile } = await supabase
    .from("users")
    .select("notifications_started_at")
    .eq("id", user.id)
    .single();
  const startedAt =
    (profile as { notifications_started_at?: string | null } | null)
      ?.notifications_started_at ?? null;
  // F252 — 알림 시작 사용자는 그 기준일자로, 미시작 사용자는 가입일(created_at) 경과일로 진도 계산.
  // 예: 가입 당일 → day 1, 가입 후 3일 → day 3. (시청 여부와 무관하게 일자에 따라 자동 진행)
  const dayNumber =
    computeDayNumber(startedAt) ?? computeDayNumber(user.created_at) ?? 1;

  let row:
    | { title: string; video_url: string | null; duration_seconds: number | null }
    | null = null;
  const res = await supabase
    .from("notification_videos")
    .select("title, video_url, duration_seconds")
    .eq("day_number", dayNumber)
    .maybeSingle();
  if (
    res.error &&
    (res.error.code === "42703" || /video_url/.test(res.error.message))
  ) {
    const r2 = await supabase
      .from("notification_videos")
      .select("title, duration_seconds")
      .eq("day_number", dayNumber)
      .maybeSingle();
    if (r2.data) {
      row = {
        ...(r2.data as { title: string; duration_seconds: number | null }),
        video_url: null,
      };
    }
  } else if (!res.error && res.data) {
    row = res.data as unknown as {
      title: string;
      video_url: string | null;
      duration_seconds: number | null;
    };
  }
  if (!row) return { ok: false, reason: "no_row", dayNumber };

  const videoUrl = await getVideoUrl(row.video_url);
  return {
    ok: true,
    dayNumber,
    title: row.title,
    videoUrl,
    durationSeconds: row.duration_seconds,
  };
}
