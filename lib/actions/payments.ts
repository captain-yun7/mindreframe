"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { confirmTossPayment } from "@/lib/payments/toss";
import { getPlanSpec, type PaidPlan } from "@/lib/payments/plans";

type CreateOrderResult =
  | { ok: true; orderId: string; orderName: string; amount: number; customerEmail: string | null; customerName: string | null }
  | { ok: false; error: string };

export async function createOrder(plan: PaidPlan): Promise<CreateOrderResult> {
  const spec = await getPlanSpec(plan);
  if (!spec) return { ok: false, error: "잘못된 플랜입니다" };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { data: profile } = await supabase
    .from("users")
    .select("nickname, email")
    .eq("id", user.id)
    .maybeSingle();

  const orderId = `ord_${spec.slug}_${user.id.slice(0, 8)}_${Date.now()}`;
  const orderName = `가짜생각 ${spec.name} (${spec.durationDays}일)`;

  const { error } = await supabaseAdmin.from("payments").insert({
    user_id: user.id,
    order_id: orderId,
    amount: spec.amount,
    plan: spec.slug,
    payment_type: "one_time",
    status: "pending",
  });

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    orderId,
    orderName,
    amount: spec.amount,
    customerEmail: profile?.email ?? user.email ?? null,
    customerName: profile?.nickname ?? null,
  };
}

type ConfirmResult =
  | { ok: true; plan: PaidPlan; expiresAt: string }
  | { ok: false; error: string };

export async function confirmOrder(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<ConfirmResult> {
  const { data: payment, error: lookupError } = await supabaseAdmin
    .from("payments")
    .select("id, user_id, amount, plan, status")
    .eq("order_id", input.orderId)
    .maybeSingle();

  if (lookupError || !payment) return { ok: false, error: "주문을 찾을 수 없습니다" };
  if (payment.status === "paid") {
    const spec = await getPlanSpec(payment.plan);
    if (!spec) return { ok: false, error: "잘못된 플랜입니다" };
    const { data: u } = await supabaseAdmin
      .from("users")
      .select("plan_expires_at")
      .eq("id", payment.user_id)
      .maybeSingle();
    return { ok: true, plan: spec.slug, expiresAt: u?.plan_expires_at ?? "" };
  }
  // 승인 요청은 대기 주문에만. 환불·실패 주문의 성공 URL 재진입 시 토스 재호출로
  // 상태가 failed로 덮어써지는 것 방지.
  if (payment.status !== "pending") {
    return {
      ok: false,
      error: payment.status === "refunded" ? "환불된 결제예요" : "이미 처리된 주문이에요. 다시 결제해주세요",
    };
  }
  if (payment.amount !== input.amount) return { ok: false, error: "결제 금액이 일치하지 않습니다" };

  const spec2 = await getPlanSpec(payment.plan);
  if (!spec2) return { ok: false, error: "잘못된 플랜입니다" };

  const result = await confirmTossPayment({
    paymentKey: input.paymentKey,
    orderId: input.orderId,
    amount: input.amount,
  });

  if (!result.ok) {
    await supabaseAdmin
      .from("payments")
      .update({ status: "failed" })
      .eq("order_id", input.orderId);
    return { ok: false, error: result.message };
  }

  const paidAt = result.payment.approvedAt ?? new Date().toISOString();
  const expiresAt = new Date(
    Date.parse(paidAt) + spec2.durationDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error: updatePaymentError } = await supabaseAdmin
    .from("payments")
    .update({
      payment_key: result.payment.paymentKey,
      status: "paid",
      paid_at: paidAt,
    })
    .eq("order_id", input.orderId);
  if (updatePaymentError) return { ok: false, error: updatePaymentError.message };

  // plan_started_at = 결제일 (100일 차수 기산점). 컬럼 미적용 환경 fallback.
  const { todayKst } = await import("@/lib/dates");
  let updateUserError = (
    await supabaseAdmin
      .from("users")
      .update({ plan: spec2.slug, plan_expires_at: expiresAt, plan_started_at: todayKst() })
      .eq("id", payment.user_id)
  ).error;
  if (updateUserError && (updateUserError.code === "42703" || /plan_started_at/.test(updateUserError.message))) {
    updateUserError = (
      await supabaseAdmin
        .from("users")
        .update({ plan: spec2.slug, plan_expires_at: expiresAt })
        .eq("id", payment.user_id)
    ).error;
  }
  if (updateUserError) return { ok: false, error: updateUserError.message };

  // 100일 이용권으로 바꾸면 월 구독 자동결제는 중단
  const { endSubscriptionNow } = await import("@/lib/billing/subscription");
  await endSubscriptionNow(payment.user_id, "100일 이용권 결제로 전환").catch(() => {});

  // 환불로 알림이 꺼진 뒤 재결제한 유저: 번호는 이미 있어 성공 페이지 등록 칸이 안 뜨므로 여기서 알림 재개
  const { data: notif } = await supabaseAdmin
    .from("users")
    .select("phone_number, notifications_started_at")
    .eq("id", payment.user_id)
    .single();
  const n = notif as { phone_number?: string | null; notifications_started_at?: string | null } | null;
  if (n?.phone_number && !n.notifications_started_at) {
    await supabaseAdmin
      .from("users")
      .update({ notifications_started_at: todayKst() })
      .eq("id", payment.user_id);
  }

  return { ok: true, plan: spec2.slug, expiresAt };
}
