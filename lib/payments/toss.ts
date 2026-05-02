import "server-only";

const TOSS_API = "https://api.tosspayments.com/v1";

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
