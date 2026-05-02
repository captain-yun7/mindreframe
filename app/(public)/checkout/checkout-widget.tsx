"use client";

import { useEffect, useRef, useState } from "react";
import { loadTossPayments, ANONYMOUS, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";

type Props = {
  clientKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  customerEmail: string | null;
  customerName: string | null;
};

export function CheckoutWidget({
  clientKey,
  orderId,
  orderName,
  amount,
  customerEmail,
  customerName,
}: Props) {
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tossPayments = await loadTossPayments(clientKey);
        if (cancelled) return;
        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });
        widgetsRef.current = widgets;
        await widgets.setAmount({ currency: "KRW", value: amount });
        await Promise.all([
          widgets.renderPaymentMethods({ selector: "#toss-payment-methods", variantKey: "DEFAULT" }),
          widgets.renderAgreement({ selector: "#toss-agreement", variantKey: "AGREEMENT" }),
        ]);
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "결제 위젯 로드 실패");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientKey, amount]);

  async function handlePay() {
    if (!widgetsRef.current || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const origin = window.location.origin;
      await widgetsRef.current.requestPayment({
        orderId,
        orderName,
        successUrl: `${origin}/checkout/success`,
        failUrl: `${origin}/checkout/fail`,
        customerEmail: customerEmail ?? undefined,
        customerName: customerName ?? undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제 요청 실패");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div id="toss-payment-methods" />
      <div id="toss-agreement" />
      {error && (
        <p role="alert" className="text-sm text-gs-danger">{error}</p>
      )}
      <button
        type="button"
        onClick={handlePay}
        disabled={!ready || submitting}
        className="w-full py-4 rounded-[14px] bg-gs-blue text-white text-base font-bold cursor-pointer transition-colors hover:bg-gs-blue-hover disabled:bg-gs-line-mid disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2"
      >
        {submitting ? "결제창 여는 중..." : `${amount.toLocaleString()}원 결제하기`}
      </button>
    </div>
  );
}
