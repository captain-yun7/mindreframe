import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminUser } from "@/lib/auth/plan";
import {
  chargeBilling,
  deleteBillingKey,
  isBillingConfigured,
  isBillingLive,
  issueBillingKey,
} from "@/lib/payments/toss-billing";

/**
 * 월 구독 (9,900원/월 토스 자동결제).
 *
 * 정책 (2026-10-08 고객사 확정):
 *   - 100일 이용권을 2번 이상 결제 완료한 회원만 신청 가능
 *   - 분석기·생각쓰레기통 1회/일, 코칭 제외 나머지 전부 (lib/auth/plan.ts `monthly`)
 *   - 매달 같은 날 자동결제. 해지하면 이번 기간 끝까지 이용 후 무료로 전환
 *   - 갱신 결제 실패 시 다음날 다시 시도, 3번 실패하면 종료
 *
 * 갱신은 plan-expiry cron(매일 00:00 KST)이 만료 강등 전에 `renewDueSubscriptions` 호출.
 */

export const MONTHLY_PRICE = 9900;
export const MONTHLY_NAME = "월 구독";
export const REQUIRED_PAID_COUNT = 2;
const MAX_FAILED_ATTEMPTS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionStatus = "incomplete" | "active" | "past_due" | "cancelled" | "expired";

export type SubscriptionRow = {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  billing_key: string | null;
  customer_key: string | null;
  amount: number | null;
  card_label: string | null;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
  failed_attempts: number;
  last_failure_message: string | null;
};

const SUB_COLS =
  "id, user_id, status, billing_key, customer_key, amount, card_label, current_period_start, current_period_end, cancelled_at, failed_attempts, last_failure_message";

function addOneMonth(from: Date): Date {
  const d = new Date(from);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + 1);
  // 1/31 + 1개월 → 3/3 같은 넘침 방지: 말일로 고정
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}

function kstYmd(d: Date): string {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}

/** 토스 customerKey (2~50자, 특수문자 1개 이상) — 회원 uuid의 '-' 포함. */
export function customerKeyFor(userId: string): string {
  return userId;
}

/** 구독 중인 회원의 이용 기한. 자정 만료 cron보다 갱신이 늦지 않게 하루 여유. */
function accessUntil(periodEnd: Date): string {
  return new Date(periodEnd.getTime() + DAY_MS).toISOString();
}

/** 진행 중 구독: active·past_due(재시도 중, 기간 지났어도 포함) 또는 해지했지만 기간이 남은 것. */
export async function getLiveSubscription(userId: string): Promise<SubscriptionRow | null> {
  const nowIso = new Date().toISOString();
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select(SUB_COLS)
    .eq("user_id", userId)
    .or(`status.in.(active,past_due),and(status.eq.cancelled,current_period_end.gt.${nowIso})`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SubscriptionRow | null) ?? null;
}

export type Eligibility =
  | { eligible: true }
  | { eligible: false; reason: "not_configured" | "hidden" | "not_enough_payments" | "active_plan" | "already_subscribed"; message: string };

/**
 * 신청 가능 여부. 요금제 카드 노출과 신청 처리 양쪽에서 같은 기준 사용.
 * 테스트 키로 운영 중이면 관리자·BILLING_TEST_EMAILS만 (실회원에게 테스트 결제 노출 방지).
 */
export async function checkEligibility(userId: string): Promise<Eligibility> {
  if (!isBillingConfigured()) {
    return { eligible: false, reason: "not_configured", message: "월 구독 결제가 아직 준비되지 않았어요" };
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("email, role, plan, plan_expires_at")
    .eq("id", userId)
    .maybeSingle();
  const u = user as { email: string | null; role: string | null; plan: string | null; plan_expires_at: string | null } | null;
  if (!u) return { eligible: false, reason: "hidden", message: "회원 정보를 찾을 수 없어요" };

  const testers = (process.env.BILLING_TEST_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const isTester = isAdminUser(u.email, u.role) || (!!u.email && testers.includes(u.email));
  if (!isBillingLive() && !isTester) {
    return { eligible: false, reason: "hidden", message: "월 구독 결제가 아직 준비되지 않았어요" };
  }

  if (await getLiveSubscription(userId)) {
    return { eligible: false, reason: "already_subscribed", message: "이미 월 구독 중이에요" };
  }

  if (!isTester) {
    const { count } = await supabaseAdmin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "paid")
      .eq("payment_type", "one_time");
    if ((count ?? 0) < REQUIRED_PAID_COUNT) {
      return { eligible: false, reason: "not_enough_payments", message: "100일 이용권을 2번 이상 결제한 회원만 신청할 수 있어요" };
    }
  }

  // 100일 이용권이 남아 있으면 월 구독으로 바꾸는 순간 남은 기간을 잃음 → 끝난 뒤 신청
  const activeOneTime =
    u.plan && u.plan !== "free" && u.plan !== "monthly" &&
    (!u.plan_expires_at || new Date(u.plan_expires_at).getTime() > Date.now());
  if (activeOneTime) {
    return { eligible: false, reason: "active_plan", message: "지금 이용 중인 100일 이용권이 끝난 뒤 신청할 수 있어요" };
  }

  return { eligible: true };
}

async function loadCustomer(userId: string) {
  const { data } = await supabaseAdmin.from("users").select("email, nickname").eq("id", userId).maybeSingle();
  const d = data as { email: string | null; nickname: string | null } | null;
  return { email: d?.email ?? null, name: d?.nickname ?? null };
}

/** 결제 1건 실행 + payments 기록. 같은 orderId 재실행은 insert 단계에서 막힘. */
async function chargeAndRecord(sub: { id: string; user_id: string; billing_key: string; customer_key: string; amount: number }, orderId: string) {
  const { error: insertError } = await supabaseAdmin.from("payments").insert({
    user_id: sub.user_id,
    order_id: orderId,
    amount: sub.amount,
    plan: "monthly",
    payment_type: "subscription",
    subscription_id: sub.id,
    status: "pending",
  });
  if (insertError) return { ok: false as const, code: "DUPLICATE_ORDER", message: insertError.message };

  const customer = await loadCustomer(sub.user_id);
  const result = await chargeBilling({
    billingKey: sub.billing_key,
    customerKey: sub.customer_key,
    amount: sub.amount,
    orderId,
    orderName: `가짜생각 ${MONTHLY_NAME}`,
    customerEmail: customer.email,
    customerName: customer.name,
  });

  if (!result.ok) {
    await supabaseAdmin.from("payments").update({ status: "failed" }).eq("order_id", orderId);
    return result;
  }
  await supabaseAdmin
    .from("payments")
    .update({
      status: "paid",
      payment_key: result.payment.paymentKey,
      paid_at: result.payment.approvedAt ?? new Date().toISOString(),
    })
    .eq("order_id", orderId);
  return { ok: true as const };
}

/**
 * 카드 등록 성공 콜백 → 빌링키 발급 → 첫 달 결제 → 월 구독 시작.
 * customerKey는 로그인 회원 것과 일치해야 함 (다른 회원 키로 등록 시도 차단).
 */
export async function startSubscription(input: {
  userId: string;
  authKey: string;
  customerKey: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (input.customerKey !== customerKeyFor(input.userId)) {
    return { ok: false, message: "잘못된 요청이에요. 다시 시도해주세요" };
  }
  const elig = await checkEligibility(input.userId);
  if (!elig.eligible) {
    // 새로고침 등으로 콜백이 다시 들어온 경우: 이미 구독 중이면 성공으로 처리
    if (elig.reason === "already_subscribed") return { ok: true };
    return { ok: false, message: elig.message };
  }

  const issued = await issueBillingKey({ authKey: input.authKey, customerKey: input.customerKey });
  if (!issued.ok) {
    // authKey는 1회용 — 콜백 중복 호출이면 앞선 요청이 이미 구독을 만들었을 수 있음
    if (await getLiveSubscription(input.userId)) return { ok: true };
    return { ok: false, message: `카드 등록에 실패했어요 (${issued.message})` };
  }

  const now = new Date();
  const periodEnd = addOneMonth(now);
  const { data: created, error } = await supabaseAdmin
    .from("subscriptions")
    .insert({
      user_id: input.userId,
      status: "incomplete",
      plan: "monthly",
      billing_key: issued.billing.billingKey,
      customer_key: input.customerKey,
      amount: MONTHLY_PRICE,
      card_label: issued.billing.cardLabel,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    })
    .select("id")
    .single();
  if (error || !created) {
    await deleteBillingKey(issued.billing.billingKey);
    return { ok: false, message: "구독 생성에 실패했어요. 다시 시도해주세요" };
  }
  const subId = (created as { id: string }).id;

  const charged = await chargeAndRecord(
    { id: subId, user_id: input.userId, billing_key: issued.billing.billingKey, customer_key: input.customerKey, amount: MONTHLY_PRICE },
    `sub_${subId.slice(0, 8)}_${kstYmd(now)}_first`,
  );
  if (!charged.ok) {
    await supabaseAdmin.from("subscriptions").update({ status: "expired", last_failure_message: charged.message, updated_at: new Date().toISOString() }).eq("id", subId);
    await deleteBillingKey(issued.billing.billingKey);
    return { ok: false, message: `첫 결제에 실패했어요 (${charged.message})` };
  }

  // 진행 중 구독 1개 제약(unique index)에 걸리면 동시 요청 — 이 건은 환불 대상이라 운영자 확인 필요
  const { error: activateError } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", subId);
  if (activateError) {
    console.error("[startSubscription] activate failed after charge", subId, activateError.message);
    return { ok: false, message: "결제는 완료됐지만 구독 활성화에 실패했어요. 고객센터로 문의해주세요" };
  }

  await supabaseAdmin
    .from("users")
    .update({ plan: "monthly", plan_expires_at: accessUntil(periodEnd), updated_at: new Date().toISOString() })
    .eq("id", input.userId);

  return { ok: true };
}

/** 해지: 자동결제만 멈추고 이번 기간 끝까지 이용. */
export async function cancelSubscription(userId: string): Promise<{ ok: true; until: string } | { ok: false; message: string }> {
  const sub = await getLiveSubscription(userId);
  if (!sub || sub.status === "cancelled") return { ok: false, message: "해지할 구독이 없어요" };
  const nowIso = new Date().toISOString();
  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: nowIso, updated_at: nowIso })
    .eq("id", sub.id);
  await supabaseAdmin
    .from("users")
    .update({ plan_expires_at: sub.current_period_end, updated_at: nowIso })
    .eq("id", userId);
  return { ok: true, until: sub.current_period_end };
}

/** 해지 취소: 기간이 남아 있으면 다시 자동결제로. */
export async function resumeSubscription(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const sub = await getLiveSubscription(userId);
  if (!sub || sub.status !== "cancelled" || !sub.billing_key) return { ok: false, message: "다시 시작할 구독이 없어요" };
  const nowIso = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "active", cancelled_at: null, updated_at: nowIso })
    .eq("id", sub.id);
  if (error) return { ok: false, message: "다시 시작하지 못했어요. 잠시 후 다시 시도해주세요" };
  await supabaseAdmin
    .from("users")
    .update({ plan: "monthly", plan_expires_at: accessUntil(new Date(sub.current_period_end)), updated_at: nowIso })
    .eq("id", userId);
  return { ok: true };
}

/** 100일 이용권 결제·환불 등으로 월 구독을 즉시 끝낼 때 (자동결제 중단 + 빌링키 삭제). */
export async function endSubscriptionNow(userId: string, reason: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("id, billing_key")
    .eq("user_id", userId)
    .in("status", ["active", "past_due", "cancelled"]);
  const nowIso = new Date().toISOString();
  for (const s of (data ?? []) as { id: string; billing_key: string | null }[]) {
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "expired", cancelled_at: nowIso, last_failure_message: reason, updated_at: nowIso })
      .eq("id", s.id);
    if (s.billing_key) await deleteBillingKey(s.billing_key);
  }
}

/**
 * 갱신 배치 — plan-expiry cron에서 만료 강등보다 먼저 호출.
 *   active/past_due + 기간 종료 → 결제. 성공 시 한 달 연장, 실패 시 다음날 재시도(최대 3회)
 *   cancelled + 기간 종료 → expired + 빌링키 삭제 (회원 강등은 plan_expires_at 기준으로 만료 cron이 처리)
 */
export async function renewDueSubscriptions(): Promise<{ renewed: number; failed: number; ended: number; errors: string[] }> {
  const now = new Date();
  const nowIso = now.toISOString();
  const out = { renewed: 0, failed: 0, ended: 0, errors: [] as string[] };

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select(SUB_COLS)
    .in("status", ["active", "past_due", "cancelled"])
    .lte("current_period_end", nowIso);
  if (error) {
    // 마이그레이션 미적용 환경 — 만료 cron 자체는 계속 돌아야 하므로 에러만 보고
    out.errors.push(error.message);
    return out;
  }

  for (const sub of (data ?? []) as SubscriptionRow[]) {
    if (sub.status === "cancelled" || !sub.billing_key || !sub.customer_key) {
      await supabaseAdmin.from("subscriptions").update({ status: "expired", updated_at: nowIso }).eq("id", sub.id);
      if (sub.billing_key) await deleteBillingKey(sub.billing_key);
      out.ended++;
      continue;
    }

    const periodEnd = new Date(sub.current_period_end);
    const attempt = sub.failed_attempts + 1;
    const charged = await chargeAndRecord(
      { id: sub.id, user_id: sub.user_id, billing_key: sub.billing_key, customer_key: sub.customer_key, amount: sub.amount ?? MONTHLY_PRICE },
      `sub_${sub.id.slice(0, 8)}_${kstYmd(periodEnd)}_${attempt}`,
    );

    if (charged.ok) {
      const nextEnd = addOneMonth(periodEnd);
      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "active",
          current_period_start: periodEnd.toISOString(),
          current_period_end: nextEnd.toISOString(),
          failed_attempts: 0,
          last_failure_message: null,
          updated_at: nowIso,
        })
        .eq("id", sub.id);
      await supabaseAdmin
        .from("users")
        .update({ plan: "monthly", plan_expires_at: accessUntil(nextEnd), updated_at: nowIso })
        .eq("id", sub.user_id);
      out.renewed++;
      continue;
    }

    out.failed++;
    out.errors.push(`${sub.id.slice(0, 8)}: ${charged.code} ${charged.message}`);
    if (attempt >= MAX_FAILED_ATTEMPTS) {
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "expired", failed_attempts: attempt, last_failure_message: charged.message, updated_at: nowIso })
        .eq("id", sub.id);
      await supabaseAdmin
        .from("users")
        .update({ plan: "free", plan_expires_at: null, updated_at: nowIso })
        .eq("id", sub.user_id);
      await deleteBillingKey(sub.billing_key);
    } else {
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "past_due", failed_attempts: attempt, last_failure_message: charged.message, updated_at: nowIso })
        .eq("id", sub.id);
      // 재시도 기간에도 이용은 유지
      await supabaseAdmin
        .from("users")
        .update({ plan_expires_at: accessUntil(now), updated_at: nowIso })
        .eq("id", sub.user_id);
    }
  }
  return out;
}
