"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "../../_ui/confirm-dialog";
import {
  adminCancelSubscription,
  adminResumeSubscription,
} from "@/lib/actions/admin-subscriptions";

type Mode = "cancel" | "resume";

/**
 * 구독 상태 액션 버튼. status에 따라 해지/재개 버튼 노출.
 * DB 상태만 변경하며 외부 결제사 해지는 별도 처리가 필요함을 안내.
 */
export function SubscriptionActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [openMode, setOpenMode] = useState<Mode | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const run = (mode: Mode) => {
    startTransition(async () => {
      const r =
        mode === "cancel"
          ? await adminCancelSubscription(id)
          : await adminResumeSubscription(id);
      if (r.ok) {
        toast.show(mode === "cancel" ? "구독을 해지했어요" : "구독을 재개했어요", "success");
        setOpenMode(null);
        router.refresh();
      } else {
        toast.show(r.error, "error");
      }
    });
  };

  const canCancel = status === "active" || status === "paused";
  const canResume = status === "cancelled" || status === "paused";

  return (
    <>
      {canCancel && (
        <Button
          variant="destructive"
          onClick={() => setOpenMode("cancel")}
          disabled={pending}
        >
          구독 해지
        </Button>
      )}
      {canResume && (
        <Button
          variant="default"
          onClick={() => setOpenMode("resume")}
          disabled={pending}
        >
          구독 재개
        </Button>
      )}

      <ConfirmDialog
        open={openMode === "cancel"}
        onClose={() => setOpenMode(null)}
        onConfirm={() => run("cancel")}
        title="구독 해지"
        description="이 구독을 해지 상태로 변경합니다. 외부 결제사(빌링) 해지는 별도로 처리해야 합니다."
        confirmLabel="해지"
        tone="danger"
      />
      <ConfirmDialog
        open={openMode === "resume"}
        onClose={() => setOpenMode(null)}
        onConfirm={() => run("resume")}
        title="구독 재개"
        description="이 구독을 활성 상태로 되돌립니다."
        confirmLabel="재개"
      />
    </>
  );
}
