import "server-only";

const TOSS_API = "https://api.tosspayments.com/v1";

function authHeaderOrNull(): string | null {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) return null;
  const encoded = Buffer.from(`${secret}:`).toString("base64");
  return `Basic ${encoded}`;
}

type ConfirmInput = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

export type TossPayment = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  approvedAt: string | null;
  method: string | null;
};

function authHeader(): string {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) throw new Error("TOSS_SECRET_KEY is not set");
  const encoded = Buffer.from(`${secret}:`).toString("base64");
  return `Basic ${encoded}`;
}

export async function confirmTossPayment(
  input: ConfirmInput,
): Promise<{ ok: true; payment: TossPayment } | { ok: false; code: string; message: string }> {
  const res = await fetch(`${TOSS_API}/payments/confirm`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok) {
    return {
      ok: false,
      code: json.code ?? "UNKNOWN",
      message: json.message ?? "결제 승인에 실패했습니다",
    };
  }

  return {
    ok: true,
    payment: {
      paymentKey: json.paymentKey,
      orderId: json.orderId,
      status: json.status,
      totalAmount: json.totalAmount,
      approvedAt: json.approvedAt ?? null,
      method: json.method ?? null,
    },
  };
}

export type TossCancelInput = {
  paymentKey: string;
  cancelReason: string;
};

/**
 * 토스 결제 풀 환불 (cancel). 부분 환불은 본 sprint 범위 밖.
 *
 * ENV:
 *   TOSS_SECRET_KEY 미설정 시 — `{ ok: false, code: 'NOT_CONFIGURED' }` 반환.
 *   호출자는 NOT_CONFIGURED일 때 DB만 마킹하고 운영자에게 수동 환불 안내.
 */
export async function cancelTossPayment(
  input: TossCancelInput,
): Promise<
  | { ok: true; payment: TossPayment }
  | { ok: false; code: string; message: string }
> {
  const auth = authHeaderOrNull();
  if (!auth) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: "토스 PG 키가 설정되지 않았습니다. 수동 환불로 진행해주세요.",
    };
  }

  try {
    const res = await fetch(
      `${TOSS_API}/payments/${input.paymentKey}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cancelReason: input.cancelReason }),
        cache: "no-store",
      },
    );
    const json = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        code: json.code ?? "UNKNOWN",
        message: json.message ?? "환불 처리에 실패했습니다",
      };
    }
    return {
      ok: true,
      payment: {
        paymentKey: json.paymentKey,
        orderId: json.orderId,
        status: json.status,
        totalAmount: json.totalAmount,
        approvedAt: json.approvedAt ?? null,
        method: json.method ?? null,
      },
    };
  } catch (e) {
    return {
      ok: false,
      code: "NETWORK",
      message: e instanceof Error ? e.message : "네트워크 오류",
    };
  }
}
