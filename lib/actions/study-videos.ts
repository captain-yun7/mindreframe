"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getVideoUrl } from "@/lib/video/r2-video";
import { normalizePlan, planAtLeast, type Plan } from "@/lib/auth/plan";

/**
 * /study 페이지에서 사용하는 영상 관련 server actions.
 *
 * 1) 100일 루틴 3분 영상 그리드 — 1~100 day 카드를 항상 표시.
 *    free 유저도 시청 가능 (인증 가드 없음).
 *    DB(notification_videos)에 row가 있으면 그 title/video_url을 우선 사용,
 *    없으면 admin 업로드 함수가 강제하는 정식 R2 키 패턴(`video/day-N.mp4`)으로
 *    직접 presign — `lib/actions/admin-daily-video.ts`의 `expectedObjectKey`와 동일.
 * 2) 필수영상 1·2 — site_settings 키(`intro_video_{1,2}_url`)에 저장된 R2 객체 키 → presigned URL.
 *    light 이상만 시청 가능.
 */

export interface RoutineVideoMeta {
  dayNumber: number;
  title: string;
  durationSeconds: number | null;
  hasVideo: boolean;
}

const PAGE_SIZE_DEFAULT = 20;
const MAX_DAY = 100;

/** admin-daily-video.ts:expectedObjectKey와 동일. 변경 시 양쪽 같이 수정. */
function routineObjectKey(dayNumber: number): string {
  return `video/day-${dayNumber}.mp4`;
}

export async function getRoutineVideosBatch(
  offset: number,
  limit: number = PAGE_SIZE_DEFAULT,
): Promise<{ items: RoutineVideoMeta[]; nextOffset: number | null }> {
  const clampedLimit = Math.max(1, Math.min(Math.floor(limit) || PAGE_SIZE_DEFAULT, 50));
  const clampedOffset = Math.max(0, Math.min(Math.floor(offset) || 0, MAX_DAY - 1));
  const startDay = clampedOffset + 1;
  const endDay = Math.min(MAX_DAY, clampedOffset + clampedLimit);

  // DB row가 있으면 메타(title/duration) 우선 사용. 없어도 placeholder 카드는 항상 보여준다.
  const supabase = await createSupabaseServerClient();
  const res = await supabase
    .from("notification_videos")
    .select("day_number, title, video_url, duration_seconds")
    .gte("day_number", startDay)
    .lte("day_number", endDay);

  const rowsByDay = new Map<
    number,
    { title: string; videoUrl: string | null; durationSeconds: number | null }
  >();
  if (!res.error && res.data) {
    for (const r of res.data as Array<{
      day_number: number;
      title: string;
      video_url: string | null;
      duration_seconds: number | null;
    }>) {
      rowsByDay.set(r.day_number, {
        title: r.title,
        videoUrl: r.video_url,
        durationSeconds: r.duration_seconds ?? null,
      });
    }
  } else if (
    res.error &&
    (res.error.code === "42703" || /video_url/.test(res.error.message))
  ) {
    // video_url 컬럼 미적용 환경 — title만이라도 fetch
    const r2 = await supabase
      .from("notification_videos")
      .select("day_number, title, duration_seconds")
      .gte("day_number", startDay)
      .lte("day_number", endDay);
    if (!r2.error && r2.data) {
      for (const r of r2.data as Array<{
        day_number: number;
        title: string;
        duration_seconds: number | null;
      }>) {
        rowsByDay.set(r.day_number, {
          title: r.title,
          videoUrl: null,
          durationSeconds: r.duration_seconds ?? null,
        });
      }
    }
  }

  const items: RoutineVideoMeta[] = [];
  for (let day = startDay; day <= endDay; day++) {
    const row = rowsByDay.get(day);
    items.push({
      dayNumber: day,
      title: row?.title ?? `${day}일차`,
      durationSeconds: row?.durationSeconds ?? null,
      // DB row의 video_url이 있으면 그걸, 없어도 정식 키 패턴(`video/day-N.mp4`)로 fallback.
      hasVideo: true,
    });
  }

  return {
    items,
    nextOffset: endDay >= MAX_DAY ? null : endDay,
  };
}

export type RoutineVideoUrlResult =
  | { ok: true; url: string | null; title: string }
  | { ok: false; error: string };

export async function getRoutineVideoSignedUrl(
  dayNumber: number,
): Promise<RoutineVideoUrlResult> {
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > MAX_DAY) {
    return { ok: false, error: "잘못된 일차" };
  }

  let title = `${dayNumber}일차`;
  let videoKey: string | null = null;

  const supabase = await createSupabaseServerClient();
  const res = await supabase
    .from("notification_videos")
    .select("title, video_url")
    .eq("day_number", dayNumber)
    .maybeSingle();
  if (!res.error && res.data) {
    const row = res.data as { title: string; video_url: string | null };
    title = row.title || title;
    videoKey = row.video_url;
  } else if (
    res.error &&
    (res.error.code === "42703" || /video_url/.test(res.error.message))
  ) {
    const r2 = await supabase
      .from("notification_videos")
      .select("title")
      .eq("day_number", dayNumber)
      .maybeSingle();
    if (!r2.error && r2.data) {
      title = (r2.data as { title: string }).title || title;
    }
  }

  // DB에 video_url이 없어도 admin 업로드가 강제하는 정식 키 패턴으로 fallback.
  if (!videoKey || videoKey.trim().length === 0) {
    videoKey = routineObjectKey(dayNumber);
  }

  const url = await getVideoUrl(videoKey);
  return { ok: true, url, title };
}

export type IntroVideoUrlResult =
  | { ok: true; url: string | null }
  | { ok: false; reason: "plan" | "not_found" };

export async function getIntroVideoSignedUrl(
  slot: 1 | 2,
): Promise<IntroVideoUrlResult> {
  if (slot !== 1 && slot !== 2) return { ok: false, reason: "not_found" };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "plan" };

  const { data: u } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan: Plan = normalizePlan((u as { plan?: string } | null)?.plan);
  if (!planAtLeast(plan, "light")) return { ok: false, reason: "plan" };

  const { data: setting } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", `intro_video_${slot}_url`)
    .maybeSingle();
  const objectKey =
    (setting as { value: string | null } | null)?.value?.trim() || null;
  if (!objectKey) return { ok: true, url: null };
  const url = await getVideoUrl(objectKey);
  return { ok: true, url };
}
