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

  const { data: existing } = await supabase
    .from("users")
    .select("nickname_set")
    .eq("id", user.id)
    .single();
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
