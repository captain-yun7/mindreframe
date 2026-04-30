"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function updateNickname(nickname: string) {
  const trimmed = nickname.trim();
  if (!trimmed) return { ok: false as const, error: "닉네임을 입력해주세요" };
  if (trimmed.length > 30) return { ok: false as const, error: "닉네임은 30자 이내" };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("users")
    .update({ nickname: trimmed, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/mypage");
  return { ok: true as const };
}
