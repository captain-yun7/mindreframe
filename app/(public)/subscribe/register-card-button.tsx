"use client";

import { useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

type Props = {
  clientKey: string;
  customerKey: string;
  customerEmail: string | null;
  customerName: string | null;
  amount: number;
};

export function RegisterCardButton({ clientKey, customerKey, customerEmail, customerName, amount }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey });
      const origin = window.location.origin;
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${origin}/api/billing/subscribe/callback`,
        failUrl: `${origin}/subscribe`,
        customerEmail,
        customerName,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "카드 등록 창을 열지 못했어요");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-gs-danger">{error}</p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className="w-full py-4 rounded-[14px] bg-gs-blue text-white text-base font-bold cursor-pointer transition-colors hover:bg-gs-blue-hover disabled:bg-gs-line-mid disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2"
      >
        {submitting ? "카드 등록 창 여는 중..." : `카드 등록하고 월 ${amount.toLocaleString()}원 구독 시작`}
      </button>
    </div>
  );
}
