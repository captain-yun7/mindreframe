"use server";

import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVideoUploadUrl, getVideoUrl } from "@/lib/video/r2-video";

/**
 * 코치 채팅 이미지 전송 (2026-08-25).
 * 업로드: presigned PUT으로 브라우저가 R2에 직접 업로드 (영상 업로드와 동일 패턴).
 * 표시: image_key → presigned GET (30분). 키 형식: chat/{sessionId}/{uuid}.{ext}
 */

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const KEY_PATTERN = /^chat\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;

/** 호출자가 해당 세션의 당사자(본인) 또는 코치/어드민인지 확인. */
async function canAccessSession(sessionId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: session } = await supabaseAdmin
    .from("coach_chat_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return false;
  if ((session as { user_id: string }).user_id === user.id) return true;

  const { data: u } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (u as { role?: string } | null)?.role;
  return role === "coach" || role === "admin";
}

export async function getChatImageUploadUrl(
  sessionId: string,
  contentType: string,
) {
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) {
    return {
      ok: false as const,
      error: "JPG·PNG·WebP·GIF 이미지만 전송할 수 있어요",
    };
  }
  if (!(await canAccessSession(sessionId))) {
    return { ok: false as const, error: "권한이 없어요" };
  }

  const imageKey = `chat/${sessionId}/${randomUUID()}.${ext}`;
  const put = await getVideoUploadUrl(imageKey, contentType, 600);
  if (!put) {
    return { ok: false as const, error: "업로드 URL 발급에 실패했어요" };
  }
  return { ok: true as const, uploadUrl: put.url, imageKey };
}

export async function getChatImageViewUrl(imageKey: string) {
  const m = KEY_PATTERN.exec(imageKey);
  if (!m) return { ok: false as const, error: "잘못된 이미지 키" };
  if (!(await canAccessSession(m[1]))) {
    return { ok: false as const, error: "권한이 없어요" };
  }
  const url = await getVideoUrl(imageKey);
  if (!url) return { ok: false as const, error: "이미지 URL 발급 실패" };
  return { ok: true as const, url };
}
