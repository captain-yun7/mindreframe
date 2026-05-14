"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Plan } from "@/lib/auth/plan";

/**
 * 베타 기간 임시 plan 변경 + 휴대폰/알림 시작 등록.
 * PG 심사 통과 후 토스 webhook으로 대체될 예정.
 *
 * phoneNumber는 free 플랜 활성화 시엔 선택, 유료 플랜은 필수.
 */
export async function activateBetaPlan(plan: Plan, phoneNumber?: string) {
  if (process.env.BETA_PLAN_SELECT_ENABLED === "false") {
    return { ok: false as const, error: "결제 시스템 준비 중입니다 (PG 심사 후 가능)" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  // 유료 플랜은 휴대폰 번호 필수 (알림톡 발송 대상)
  const isPaid = plan !== "free";
  let cleanedPhone: string | null = null;
  if (isPaid) {
    cleanedPhone = (phoneNumber ?? "").replace(/[^0-9]/g, "");
    if (!/^01[0-9]{8,9}$/.test(cleanedPhone)) {
      return { ok: false as const, error: "휴대폰 번호를 정확히 입력해주세요" };
    }
  }

  // 100일 후 만료 (베타: 충분한 체험 기간)
  const expires = new Date();
  expires.setDate(expires.getDate() + 100);

  const update: Record<string, unknown> = {
    plan,
    plan_expires_at: expires.toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (isPaid && cleanedPhone) {
    update.phone_number = cleanedPhone;
    update.notifications_started_at = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase.from("users").update(update).eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/mypage");
  revalidatePath("/pricing");
  return { ok: true as const, plan };
}
