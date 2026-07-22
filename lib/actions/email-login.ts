"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * 이메일/비밀번호 로그인 — PG 심사·테스트 계정용.
 *
 * 가입 경로는 열지 않는다. Supabase Dashboard에서 직접 생성한 계정만
 * 로그인 가능하므로 일반 사용자는 기존 소셜/익명 가입 플로우를 그대로 쓴다.
 */
export type EmailLoginResult = { ok: false; error: string };

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

  redirect(next.startsWith("/") ? next : "/dashboard");
}
