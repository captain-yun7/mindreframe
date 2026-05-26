"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getVideoUploadUrl } from "@/lib/video/r2-video";
import { writeAudit } from "./_audit";

/**
 * F78 — 어드민이 일차별 영상을 R2에 업로드/등록하기 위한 server actions.
 *
 * 흐름:
 *   1) requestVideoUploadUrl(day) → presigned PUT URL + 고정 객체 키 `video/day-N.mp4`
 *   2) 클라이언트(XHR PUT)가 R2로 직접 업로드 (Vercel 50MB 한계 회피)
 *   3) confirmVideoUpload(day, objectKey) → DB에 video_url 갱신 + audit log
 */

async function ensureAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };
  const { data: u } = await sb
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (u?.role !== "admin") {
    return { ok: false, error: "관리자 권한이 필요합니다" };
  }
  return { ok: true, userId: user.id };
}

function expectedObjectKey(dayNumber: number): string {
  return `video/day-${dayNumber}.mp4`;
}

/** 어드민 업로드에서 허용되는 Content-Type 화이트리스트. */
const ALLOWED_UPLOAD_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

/**
 * R2 PUT presigned URL 발급. 객체 키는 `video/day-N.mp4` 고정.
 * 만료: 30분 (대용량 mp4 업로드 여유).
 */
export async function requestVideoUploadUrl(
  dayNumber: number,
  contentType: string = "video/mp4",
) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;
  if (
    !Number.isInteger(dayNumber) ||
    dayNumber < 1 ||
    dayNumber > 100
  ) {
    return { ok: false as const, error: "day_number는 1~100" };
  }
  // 화이트리스트 외 Content-Type 거부 (host만 서명되지만 클라가 보낼 헤더 정합성 확보)
  const safeContentType = ALLOWED_UPLOAD_TYPES.has(contentType)
    ? contentType
    : "video/mp4";

  const objectKey = expectedObjectKey(dayNumber);
  const presigned = await getVideoUploadUrl(objectKey, safeContentType, 60 * 30);
  if (!presigned) {
    return {
      ok: false as const,
      error: "R2 환경변수가 설정되지 않았습니다 (R2_*)",
    };
  }
  return {
    ok: true as const,
    uploadUrl: presigned.url,
    objectKey: presigned.objectKey,
    contentType: presigned.contentType,
  };
}

/**
 * 업로드 완료 후 DB(notification_videos)에 video_url 갱신.
 * 악의적 임의 객체 키 차단을 위해 예상 패턴 `video/day-N.mp4`만 허용.
 */
export async function confirmVideoUpload(
  dayNumber: number,
  objectKey: string,
) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;
  if (
    !Number.isInteger(dayNumber) ||
    dayNumber < 1 ||
    dayNumber > 100
  ) {
    return { ok: false as const, error: "day_number는 1~100" };
  }
  const expected = expectedObjectKey(dayNumber);
  if (objectKey !== expected) {
    return {
      ok: false as const,
      error: `objectKey 불일치 (예상: ${expected})`,
    };
  }

  const { data: existing } = await supabaseAdmin
    .from("notification_videos")
    .select("day_number, title")
    .eq("day_number", dayNumber)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("notification_videos")
    .upsert(
      {
        day_number: dayNumber,
        title: existing?.title ?? `${dayNumber}일차 영상`,
        video_url: objectKey,
        updated_by: guard.userId,
      },
      { onConflict: "day_number" },
    );
  if (error) return { ok: false as const, error: error.message };

  await writeAudit({
    adminUserId: guard.userId,
    action: "daily_video.confirm_upload",
    payload: { dayNumber, objectKey },
  });
  revalidatePath("/admin/study/videos");
  revalidatePath("/dashboard");
  revalidatePath("/study/today/play");
  return { ok: true as const, objectKey };
}

/**
 * 영상 연결 해제 (DB의 video_url을 null로). R2 객체 자체는 보존 (P2에서 삭제).
 */
export async function clearVideoUrl(dayNumber: number) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;
  if (
    !Number.isInteger(dayNumber) ||
    dayNumber < 1 ||
    dayNumber > 100
  ) {
    return { ok: false as const, error: "day_number는 1~100" };
  }

  const { error } = await supabaseAdmin
    .from("notification_videos")
    .update({ video_url: null, updated_by: guard.userId })
    .eq("day_number", dayNumber);
  if (error) return { ok: false as const, error: error.message };

  await writeAudit({
    adminUserId: guard.userId,
    action: "daily_video.clear_url",
    payload: { dayNumber },
  });
  revalidatePath("/admin/study/videos");
  return { ok: true as const };
}
