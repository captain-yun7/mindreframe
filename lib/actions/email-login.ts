"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * 이메일/비밀번호 로그인 — PG 심사·테스트 계정용.
 *
 * 가입 경로는 열지 않는다. Supabase Dashboard에서 직접 생성한 계정만
 * 로그인 가능하므로 일반 사용자는 기존 소셜/익명 가입 플로우를 그대로 쓴다.
 */
export type EmailLoginResult =
  | { ok: false; error: string }
  | { ok: true; to: string };

export async function emailLogin(
  _prev: EmailLoginResult | null,
  formData: FormData,
): Promise<EmailLoginResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { ok: false, error: "이메일과 비밀번호를 모두 입력해주세요" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않아요" };
  }

  // 서버 redirect는 헤더(클라이언트 세션)와 주소창이 갱신되지 않아 로그인 전 상태로 보임
  // → 이동할 경로만 돌려주고 폼에서 전체 새로고침으로 이동
  const safeNext = next.startsWith("/") && !next.startsWith("//");
  return { ok: true, to: safeNext ? next : "/dashboard" };
}
