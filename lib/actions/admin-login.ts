"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ADMIN_EMAIL_WHITELIST } from "@/lib/auth/plan";

/**
 * 어드민 별도 로그인 — 이메일/비번 signInWithPassword.
 *
 * 일반 사용자 `/login`(소셜/익명 닉네임)과 완전 분리. 운영자 전용 계정은
 * Supabase Dashboard에서 직접 생성 + `role='admin'` 부여 (worklog 참고).
 *
 * 권한 판정은 middleware/`requireAdmin`이 ADMIN_EMAIL_WHITELIST + DB role로
 * 일관 처리하므로, 이 액션은 인증(signIn)만 책임지고 `/admin`으로 redirect.
 * 잘못된 사용자가 로그인해도 `/admin` 진입 시 자동으로 `/`로 튕긴다.
 */
export type AdminLoginResult = { ok: false; error: string };

export async function adminLogin(
  _prev: AdminLoginResult | null,
  formData: FormData,
): Promise<AdminLoginResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "이메일과 비밀번호를 모두 입력해주세요" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않아요" };
  }

  // 어드민 자격 1차 점검 — 화이트리스트면 즉시 통과, 아니면 DB role 확인.
  const userEmail = data.user.email ?? email;
  const isWhitelisted = ADMIN_EMAIL_WHITELIST.includes(userEmail);

  let isAdmin = isWhitelisted;
  if (!isAdmin) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();
    isAdmin = (profile as { role?: string } | null)?.role === "admin";
  }

  if (!isAdmin) {
    // 어드민 아님 — 세션 즉시 해제 후 에러
    await supabase.auth.signOut();
    return { ok: false, error: "관리자 권한이 없는 계정이에요" };
  }

  redirect("/admin");
}
