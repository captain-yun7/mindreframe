"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getVideoUrl } from "@/lib/video/r2-video";
import { normalizePlan, planAtLeast, type Plan } from "@/lib/auth/plan";

/**
 * /study 페이지에서 사용하는 영상 관련 server actions.
 *
 * 1) 100일 루틴 3분 영상 그리드 — notification_videos 1~100을 페이지네이션.
 *    free 유저도 시청 가능 (인증 가드 없음).
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

export async function getRoutineVideosBatch(
  offset: number,
  limit: number = PAGE_SIZE_DEFAULT,
): Promise<{ items: RoutineVideoMeta[]; nextOffset: number | null }> {
  const clampedLimit = Math.max(1, Math.min(Math.floor(limit) || PAGE_SIZE_DEFAULT, 50));
  const clampedOffset = Math.max(0, Math.min(Math.floor(offset) || 0, MAX_DAY - 1));

  const supabase = await createSupabaseServerClient();
  const res = await supabase
    .from("notification_videos")
    .select("day_number, title, video_url, duration_seconds")
    .gte("day_number", 1)
    .lte("day_number", MAX_DAY)
    .order("day_number", { ascending: true })
    .range(clampedOffset, clampedOffset + clampedLimit - 1);

  if (res.error) {
    // video_url 컬럼 미적용 환경 fallback
    if (res.error.code === "42703" || /video_url/.test(res.error.message)) {
      const r2 = await supabase
        .from("notification_videos")
        .select("day_number, title, duration_seconds")
        .gte("day_number", 1)
        .lte("day_number", MAX_DAY)
        .order("day_number", { ascending: true })
        .range(clampedOffset, clampedOffset + clampedLimit - 1);
      if (r2.error || !r2.data) return { items: [], nextOffset: null };
      const items = (r2.data as Array<{
        day_number: number;
        title: string;
        duration_seconds: number | null;
      }>).map((r) => ({
        dayNumber: r.day_number,
        title: r.title,
        durationSeconds: r.duration_seconds ?? null,
        hasVideo: false,
      }));
      const next = clampedOffset + items.length;
      return {
        items,
        nextOffset: items.length === 0 || next >= MAX_DAY ? null : next,
      };
    }
    return { items: [], nextOffset: null };
  }

  const rows = (res.data ?? []) as Array<{
    day_number: number;
    title: string;
    video_url: string | null;
    duration_seconds: number | null;
  }>;
  const items: RoutineVideoMeta[] = rows.map((r) => ({
    dayNumber: r.day_number,
    title: r.title,
    durationSeconds: r.duration_seconds ?? null,
    hasVideo: !!(r.video_url && r.video_url.trim().length > 0),
  }));

  const next = clampedOffset + items.length;
  return {
    items,
    nextOffset: items.length === 0 || next >= MAX_DAY ? null : next,
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
  const supabase = await createSupabaseServerClient();
  const res = await supabase
    .from("notification_videos")
    .select("title, video_url")
    .eq("day_number", dayNumber)
    .maybeSingle();
  if (
    res.error &&
    (res.error.code === "42703" || /video_url/.test(res.error.message))
  ) {
    const r2 = await supabase
      .from("notification_videos")
      .select("title")
      .eq("day_number", dayNumber)
      .maybeSingle();
    if (r2.error || !r2.data) return { ok: false, error: "영상을 찾을 수 없어요" };
    return { ok: true, url: null, title: (r2.data as { title: string }).title };
  }
  if (res.error || !res.data) return { ok: false, error: "영상을 찾을 수 없어요" };
  const row = res.data as { title: string; video_url: string | null };
  const url = await getVideoUrl(row.video_url);
  return { ok: true, url, title: row.title };
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
