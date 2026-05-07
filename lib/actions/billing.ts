"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Plan } from "@/lib/auth/plan";

/**
 * 베타 기간 임시 plan 변경.
 * PG 심사 통과 후 토스 webhook으로 대체될 예정.
 */
export async function activateBetaPlan(plan: Plan) {
  if (process.env.BETA_PLAN_SELECT_ENABLED === "false") {
    return { ok: false as const, error: "결제 시스템 준비 중입니다 (PG 심사 후 가능)" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  // 100일 후 만료 (베타: 충분한 체험 기간)
  const expires = new Date();
  expires.setDate(expires.getDate() + 100);

  const { error } = await supabase
    .from("users")
    .update({
      plan,
      plan_expires_at: expires.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/mypage");
  revalidatePath("/pricing");
  return { ok: true as const, plan };
}
