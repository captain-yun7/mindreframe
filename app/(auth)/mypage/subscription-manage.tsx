"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { cancelMySubscription, resumeMySubscription } from "@/lib/actions/subscription";

type Props = {
  status: "active" | "past_due" | "cancelled";
  periodEnd: string;
  amount: number;
  cardLabel: string | null;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

/** 월 구독 상태 + 해지 / 해지 취소. */
export function SubscriptionManage({ status, periodEnd, amount, cardLabel }: Props) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const handleCancel = () => {
    if (!window.confirm(`월 구독을 해지할까요?\n${fmt(periodEnd)}까지는 계속 이용할 수 있고, 이후 자동결제되지 않아요.`)) return;
    startTransition(async () => {
      const r = await cancelMySubscription();
      toast.show(r.ok ? "해지되었어요. 남은 기간 동안은 계속 이용할 수 있어요" : r.error, r.ok ? "success" : "error");
    });
  };

  const handleResume = () => {
    startTransition(async () => {
      const r = await resumeMySubscription();
      toast.show(r.ok ? "월 구독을 다시 이어가요" : r.error, r.ok ? "success" : "error");
    });
  };

  return (
    <div className="rounded-toss-button border border-gs-line-soft p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">월 구독 · {amount.toLocaleString()}원/월</span>
        <span className="text-xs font-bold text-gs-navy-bright">
          {status === "cancelled" ? "해지 예정" : status === "past_due" ? "결제 재시도 중" : "이용 중"}
        </span>
      </div>
      <p className="text-[13px] text-gs-muted leading-[1.6]">
        {status === "cancelled"
          ? `${fmt(periodEnd)}까지 이용할 수 있고, 이후 자동결제되지 않아요.`
          : status === "past_due"
            ? "자동결제에 실패해서 다시 시도하고 있어요. 카드 한도·유효기간을 확인해주세요."
            : `다음 결제일 ${fmt(periodEnd)}`}
        {cardLabel ? <span className="block">{cardLabel}</span> : null}
      </p>
      {status === "cancelled" ? (
        <button
          type="button"
          onClick={handleResume}
          disabled={pending}
          className="w-full py-2.5 rounded-toss-button bg-gs-blue text-white text-sm font-bold disabled:opacity-50"
        >
          해지 취소하고 계속 이용하기
        </button>
      ) : (
        <button
          type="button"
          onClick={handleCancel}
          disabled={pending}
          className="w-full py-2.5 rounded-toss-button border border-gs-line-soft bg-white text-sm font-bold text-gs-text-soft disabled:opacity-50"
        >
          월 구독 해지
        </button>
      )}
    </div>
  );
}
