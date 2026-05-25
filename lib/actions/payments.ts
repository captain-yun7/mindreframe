"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { confirmTossPayment } from "@/lib/payments/toss";
import { getPlanSpec, type PaidPlan } from "@/lib/payments/plans";
import { revalidatePath } from "next/cache";

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

  const { error: updateUserError } = await supabaseAdmin
    .from("users")
    .update({ plan: spec2.slug, plan_expires_at: expiresAt })
    .eq("id", payment.user_id);
  if (updateUserError) return { ok: false, error: updateUserError.message };

  revalidatePath("/mypage");
  revalidatePath("/dashboard");

  return { ok: true, plan: spec2.slug, expiresAt };
}
