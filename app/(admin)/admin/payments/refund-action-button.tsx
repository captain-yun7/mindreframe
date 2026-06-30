"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { adminRefundPayment } from "@/lib/actions/admin-refunds";

interface Props {
  paymentId: string;
  amount: number;
  within7Days: boolean;
}

/**
 * F91 — 환불 모달.
 * - 풀 환불 only (부분 환불은 본 sprint 범위 밖)
 * - 결제 후 7일 초과 시 경고 (차단은 아님)
 * - within7Days는 서버 컴포넌트에서 계산 후 props로 전달 (React 19 lint 회피)
 */
export function RefundActionButton({ paymentId, amount, within7Days }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.show("환불 사유를 입력해주세요", "error");
      return;
    }
    if (
      !confirm(
        `${amount.toLocaleString()}원 전액을 환불할까요? 사용자 plan이 free로 강등됩니다.`,
      )
    )
      return;
    startTransition(async () => {
      const r = await adminRefundPayment({ paymentId, reason: reason.trim() });
      if (r.ok) {
        if (r.tossSkipped) {
          toast.show(
            "DB만 마킹됨. 토스 콘솔에서 수동 환불이 필요해요",
            "success",
          );
        } else {
          toast.show("환불 완료", "success");
        }
        setOpen(false);
        setReason("");
        router.refresh();
      } else {
        toast.show(r.error, "error");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gs-danger hover:underline font-bold"
      >
        환불
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="bg-white rounded-[14px] p-5 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black">결제 환불 (전액)</h3>
            <p className="text-xs text-gs-muted mt-1">
              환불 금액: <b>{amount.toLocaleString()}원</b>
            </p>
            {!within7Days && (
              <div className="mt-3 p-2 rounded bg-gs-warning-bg border border-gs-warning-border text-xs text-gs-warning">
                결제 후 7일 초과 — 수동 검토 권장
              </div>
            )}

            <label className="block mt-4">
              <span className="text-xs text-gs-muted">환불 사유</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="예: 사용자 요청"
                className="mt-1 w-full px-2 py-1 rounded border border-gs-line-soft text-sm"
              />
            </label>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="px-4 py-2 rounded-[10px] border border-gs-line-soft text-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={pending || !reason.trim()}
                className="px-4 py-2 rounded-[10px] bg-gs-danger text-white text-sm font-bold disabled:opacity-50"
              >
                {pending ? "처리 중…" : "환불 확정"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
