"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getVideoUploadUrl } from "@/lib/video/r2-video";

/**
 * 명상 음원 R2 업로드 — 영상(admin-daily-video)과 동일 패턴.
 *
 * 흐름:
 *   1) requestMeditationAudioUploadUrl(slug, contentType) → presigned PUT URL + 객체 키 `audio/{slug}.{ext}`
 *   2) 클라이언트(XHR PUT)가 R2로 직접 업로드 (Vercel body 한계 회피)
 *   3) 반환된 publicUrl을 폼의 audio_url에 채워 저장
 *
 * 저장 형식: 기존 명상 트랙과 동일하게 public URL(`https://pub-....r2.dev/audio/...`).
 * 명상 플레이어가 audio_url을 그대로 <audio src>에 사용하므로 presigned GET 불필요.
 */

async function ensureAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };
  if (user.email === "mindtheater00@gmail.com") return { ok: true, userId: user.id };
  const { data: u } = await sb.from("users").select("role").eq("id", user.id).single();
  if (u?.role !== "admin") return { ok: false, error: "관리자 권한이 필요합니다" };
  return { ok: true, userId: user.id };
}

// 명상 음원 R2 public base. ENV 우선, 없으면 기존 트랙이 쓰던 버킷 default.
const R2_PUBLIC_BASE =
  process.env.R2_PUBLIC_BASE_URL ??
  "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev";

const ALLOWED_AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
};

const SLUG_RE = /^[a-z0-9-]+$/;

/**
 * 명상 음원 PUT presigned URL 발급. 객체 키는 `audio/{slug}.{ext}`.
 * 만료 30분(대용량 음원 여유).
 */
export async function requestMeditationAudioUploadUrl(
  slug: string,
  contentType: string,
) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const cleanSlug = slug.trim();
  if (!cleanSlug || !SLUG_RE.test(cleanSlug)) {
    return {
      ok: false as const,
      error: "slug를 먼저 입력하세요 (영문 소문자/숫자/하이픈)",
    };
  }

  const ext = ALLOWED_AUDIO_TYPES[contentType];
  if (!ext) {
    return {
      ok: false as const,
      error: "음원 파일만 업로드 가능합니다 (mp3/wav/m4a/aac/ogg)",
    };
  }

  const objectKey = `audio/${cleanSlug}.${ext}`;
  const presigned = await getVideoUploadUrl(objectKey, contentType, 60 * 30);
  if (!presigned) {
    return {
      ok: false as const,
      error: "R2 환경변수가 설정되지 않았습니다 (R2_*)",
    };
  }

  // public URL 조합 — 객체 키의 각 경로 세그먼트만 인코딩 (한글/공백 대응)
  const encodedKey = objectKey
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const publicUrl = `${R2_PUBLIC_BASE.replace(/\/+$/, "")}/${encodedKey}`;

  return {
    ok: true as const,
    uploadUrl: presigned.url,
    objectKey: presigned.objectKey,
    contentType: presigned.contentType,
    publicUrl,
  };
}
