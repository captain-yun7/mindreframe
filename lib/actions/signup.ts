"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * 닉네임 기반 익명 회원가입.
 * Supabase Anonymous Sign-In(2024+)을 사용해 비로그인 유저에게 즉시 세션을 발급한다.
 *
 * 흐름:
 *  1. supabase.auth.signInAnonymously({ options: { data: { nickname } } })
 *  2. auth.users → public.users 트리거가 raw_user_meta_data.nickname을 읽어 행 생성
 *  3. 트리거가 nickname을 못 읽거나 비어 있으면 명시적으로 update
 *
 * 전제: Supabase 대시보드 "Authentication > Settings > Allow anonymous sign-ins" 활성화 필요.
 *       비활성화 시 422 응답 → 호출자가 OAuth 안내로 폴백.
 */
export async function signUpAnonymousWithNickname(rawNickname: string) {
  const nickname = rawNickname.trim();
  if (!nickname) {
    return { ok: false as const, error: "닉네임을 입력해주세요" };
  }
  if (nickname.length > 30) {
    return { ok: false as const, error: "닉네임은 30자 이내" };
  }

  const supabase = await createSupabaseServerClient();

  // 이미 로그인된 상태라면 닉네임만 업데이트하고 통과
  const {
    data: { user: existing },
  } = await supabase.auth.getUser();
  if (existing) {
    const { error: updateErr } = await supabase
      .from("users")
      .update({ nickname, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (updateErr) return { ok: false as const, error: updateErr.message };
    return { ok: true as const, alreadySignedIn: true };
  }

  const { data, error } = await supabase.auth.signInAnonymously({
    options: { data: { nickname, full_name: nickname } },
  });

  if (error) {
    // Anonymous sign-in 비활성화: 422 / "Anonymous sign-ins are disabled"
    const isDisabled =
      error.status === 422 ||
      /anonymous sign|disabled/i.test(error.message);
    return {
      ok: false as const,
      error: isDisabled
        ? "익명 가입이 비활성화되어 있습니다. 소셜 로그인을 이용해주세요."
        : error.message,
      anonymousDisabled: isDisabled,
    };
  }

  if (!data.user) {
    return { ok: false as const, error: "사용자 생성 실패" };
  }

  // 트리거가 metadata.nickname을 못 읽었거나 빈 값일 때 대비해 명시적 동기화
  // (트리거는 full_name → name → nickname 순으로 보지만 안전망)
  const { error: syncErr } = await supabase
    .from("users")
    .update({ nickname, updated_at: new Date().toISOString() })
    .eq("id", data.user.id);
  if (syncErr) {
    // 트리거 미동작 가능성 — 행이 없을 수 있다. upsert로 폴백.
    await supabase.from("users").upsert(
      {
        id: data.user.id,
        email: `${data.user.id}@anon.local`,
        nickname,
        provider: "anonymous",
      },
      { onConflict: "id" },
    );
  }

  return { ok: true as const, alreadySignedIn: false };
}
