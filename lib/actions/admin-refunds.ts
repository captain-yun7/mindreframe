"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cancelTossPayment } from "@/lib/payments/toss";
import { writeAudit } from "./_audit";

async function ensureAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };
  const { data: u } = await sb.from("users").select("role").eq("id", user.id).single();
  if ((u as { role?: string } | null)?.role !== "admin") {
    return { ok: false, error: "관리자 권한이 필요합니다" };
  }
  return { ok: true, userId: user.id };
}

export type AdminRefundInput = {
  paymentId: string;
  reason: string;
};

/**
 * F91 — 결제 풀 환불.
 *
 * 정책 (메인 default 결정):
 *   - 풀 환불만 1차 (부분 환불·일할 계산 X)
 *   - 7일 초과 시 차단은 아님 (UI에 경고만)
 *   - 사용자 plan='free' 강등, plan_expires_at=null
 *
 * 토스 호출:
 *   - payment_key 있고 TOSS_SECRET_KEY 있으면 cancel API 호출
 *   - NOT_CONFIGURED / payment_key 없음 → DB만 마킹 + tossSkipped=true 반환
 */
export async function adminRefundPayment(input: AdminRefundInput) {
  const g = await ensureAdmin();
  if (!g.ok) return g;

  if (!input.reason.trim()) {
    return { ok: false as const, error: "환불 사유를 입력해주세요" };
  }

  // 1) payment lookup (refunded_at 컬럼 부재 환경 fallback)
  type PaymentRow = {
    id: string;
    user_id: string;
    amount: number;
    plan: string;
    status: string;
    payment_key: string | null;
    paid_at: string | null;
    refunded_at: string | null;
  };
  const res = await supabaseAdmin
    .from("payments")
    .select(
      "id, user_id, amount, plan, status, payment_key, paid_at, refunded_at",
    )
    .eq("id", input.paymentId)
    .maybeSingle();
  if (
    res.error &&
    ((res.error as { code?: string }).code === "42703" ||
      /refunded_at/.test(res.error.message))
  ) {
    return {
      ok: false as const,
      error: "마이그레이션 적용 후 사용 가능해요",
    };
  }
  if (res.error || !res.data) {
    return { ok: false as const, error: "결제 정보를 찾을 수 없어요" };
  }
  const payment = res.data as unknown as PaymentRow;

  if (payment.status === "refunded" || payment.refunded_at) {
    return { ok: false as const, error: "이미 환불된 결제예요" };
  }
  if (payment.status !== "paid") {
    return { ok: false as const, error: "완료된 결제만 환불할 수 있어요" };
  }

  const refundAmount = payment.amount;

  // 2) 토스 환불 호출
  let tossSkipped = false;
  let tossCode: string | null = null;
  if (payment.payment_key) {
    const tossResult = await cancelTossPayment({
      paymentKey: payment.payment_key,
      cancelReason: input.reason,
    });
    if (!tossResult.ok) {
      if (tossResult.code === "NOT_CONFIGURED") {
        tossSkipped = true;
        tossCode = "NOT_CONFIGURED";
      } else {
        return {
          ok: false as const,
          error: `토스 환불 실패: ${tossResult.message}`,
        };
      }
    }
  } else {
    tossSkipped = true;
    tossCode = "NO_PAYMENT_KEY";
  }

  // 3) DB 마킹
  const { error: ue } = await supabaseAdmin
    .from("payments")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      refund_reason: input.reason.trim(),
      refund_amount: refundAmount,
      refunded_by: g.userId,
    })
    .eq("id", input.paymentId);
  if (ue) {
    if (
      (ue as { code?: string }).code === "42703" ||
      /refunded_at|refund_reason|refund_amount|refunded_by/.test(ue.message)
    ) {
      return {
        ok: false as const,
        error: "마이그레이션 적용 후 사용 가능해요",
      };
    }
    return { ok: false as const, error: ue.message };
  }

  // 4) 사용자 plan 강등 (풀 환불 — free + expires=null)
  await supabaseAdmin
    .from("users")
    .update({
      plan: "free",
      plan_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.user_id);

  await writeAudit({
    adminUserId: g.userId,
    action: "payment.refund",
    targetUserId: payment.user_id,
    payload: {
      paymentId: input.paymentId,
      amount: refundAmount,
      reason: input.reason,
      tossSkipped,
      tossCode,
    },
  });

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/users/${payment.user_id}`);
  return { ok: true as const, tossSkipped };
}
