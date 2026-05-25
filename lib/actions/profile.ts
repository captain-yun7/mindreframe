"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

/**
 * F75 — 닉네임 1회 입력 (수정 불가).
 * 이미 set 된 사용자가 호출하면 거부. 어드민 수정은 admin-users.ts로 별도 분리.
 */
export async function setNicknameOnce(nickname: string) {
  const trimmed = nickname.trim();
  if (!trimmed) return { ok: false as const, error: "닉네임을 입력해주세요" };
  if (trimmed.length > 30) return { ok: false as const, error: "닉네임은 30자 이내" };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const { data: existing, error: selectErr } = await supabase
    .from("users")
    .select("nickname_set")
    .eq("id", user.id)
    .single();
  // F75-3 — select 자체가 실패하면 update를 진행하지 않음.
  // 마이그레이션 미적용(컬럼 부재) 환경에서는 명시적 안내. 그 외 에러도 안전을 위해 중단.
  if (selectErr) {
    const columnMissing =
      selectErr.code === "42703" ||
      /column .*nickname_set.* does not exist/i.test(selectErr.message);
    return {
      ok: false as const,
      error: columnMissing
        ? "닉네임 설정 기능이 아직 활성화되지 않았어요. 잠시 후 다시 시도해주세요."
        : `프로필 조회 실패: ${selectErr.message}`,
    };
  }
  if (existing?.nickname_set) {
    return { ok: false as const, error: "닉네임은 이미 설정되었습니다 (변경 불가)" };
  }

  const { error } = await supabase
    .from("users")
    .update({
      nickname: trimmed,
      nickname_set: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/mypage");
  revalidatePath("/onboarding/nickname");
  return { ok: true as const };
}

/**
 * F82 — 행동연습장 코치 열람 동의 토글.
 * 사용자가 마이페이지에서 ON/OFF. OFF 기본값, ON 일 때만 코치가 RLS 통과.
 */
export async function updateCoachViewConsent(allow: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("users")
    .update({
      allow_coach_view_exercise: allow,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "42703" || /allow_coach_view_exercise/.test(error.message)) {
      return {
        ok: false as const,
        error: "마이그레이션 적용 후 사용 가능해요",
      };
    }
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/mypage");
  return { ok: true as const };
}
