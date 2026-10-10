import "server-only";

/**
 * 토스 자동결제(빌링) API.
 *
 * 결제위젯 키(gck/gsk)가 아니라 "API 개별 연동 키"(ck/sk, 빌링 계약된 MID)를 써야 함.
 * ENV:
 *   NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY — test_ck_… / live_ck_…
 *   TOSS_BILLING_SECRET_KEY             — test_sk_… / live_sk_…
 * live 키는 토스 자동결제 추가 계약(리스크 심사) 후에만 동작 (미계약 시 NOT_SUPPORTED_METHOD).
 */

const TOSS_API = "https://api.tosspayments.com/v1";

type TossError = { ok: false; code: string; message: string };

function authHeader(): string | null {
  const secret = process.env.TOSS_BILLING_SECRET_KEY;
  if (!secret) return null;
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

async function call<T>(path: string, init: { method: string; body?: unknown }): Promise<{ ok: true; data: T } | TossError> {
  const auth = authHeader();
  if (!auth) return { ok: false, code: "NOT_CONFIGURED", message: "자동결제 키가 설정되지 않았습니다" };
  try {
    const res = await fetch(`${TOSS_API}${path}`, {
      method: init.method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      // 자동결제 승인은 최대 60초 소요 (토스 권장 타임아웃 60초 이상)
      signal: AbortSignal.timeout(65_000),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      return { ok: false, code: json.code ?? `HTTP_${res.status}`, message: json.message ?? "자동결제 처리에 실패했습니다" };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, code: "NETWORK", message: e instanceof Error ? e.message : "네트워크 오류" };
  }
}

export type BillingKeyResult = { billingKey: string; cardLabel: string | null };

/** 카드 등록 성공 리다이렉트의 authKey로 빌링키 발급. 빌링키는 재조회 불가 → 반드시 저장. */
export async function issueBillingKey(input: {
  authKey: string;
  customerKey: string;
}): Promise<{ ok: true; billing: BillingKeyResult } | TossError> {
  const r = await call<{ billingKey: string; card?: { number?: string; cardType?: string } | null }>(
    "/billing/authorizations/issue",
    { method: "POST", body: input },
  );
  if (!r.ok) return r;
  const card = r.data.card;
  return {
    ok: true,
    billing: {
      billingKey: r.data.billingKey,
      cardLabel: card?.number ? `${card.cardType ?? "카드"} ${card.number}` : null,
    },
  };
}

export type BillingCharge = { paymentKey: string; status: string; approvedAt: string | null };

/** 빌링키로 결제. orderId는 6~64자 영문·숫자·-·_ (같은 orderId 재요청은 토스가 거절 → 중복 과금 방지). */
export async function chargeBilling(input: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail?: string | null;
  customerName?: string | null;
}): Promise<{ ok: true; payment: BillingCharge } | TossError> {
  const { billingKey, ...body } = input;
  const r = await call<{ paymentKey: string; status: string; approvedAt?: string | null }>(
    `/billing/${encodeURIComponent(billingKey)}`,
    {
      method: "POST",
      body: {
        ...body,
        customerEmail: body.customerEmail ?? undefined,
        customerName: body.customerName ?? undefined,
      },
    },
  );
  if (!r.ok) return r;
  if (r.data.status !== "DONE") {
    return { ok: false, code: `STATUS_${r.data.status}`, message: "결제가 완료되지 않았습니다" };
  }
  return { ok: true, payment: { paymentKey: r.data.paymentKey, status: r.data.status, approvedAt: r.data.approvedAt ?? null } };
}

/** 빌링키 삭제 (해지 시). 실패해도 과금은 우리 cron이 멈추므로 best-effort. */
export async function deleteBillingKey(billingKey: string): Promise<{ ok: true } | TossError> {
  const r = await call<unknown>(`/billing/${encodeURIComponent(billingKey)}`, { method: "DELETE" });
  return r.ok ? { ok: true } : r;
}

/** 테스트 키로 운영 중이면 실제 회원에게 노출하지 않음 (관리자·테스트 계정만). */
export function isBillingLive(): boolean {
  return (process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY ?? "").startsWith("live_");
}

export function isBillingConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY && !!process.env.TOSS_BILLING_SECRET_KEY;
}
