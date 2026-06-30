"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "../_ui/confirm-dialog";
import { adminResendNotification } from "@/lib/actions/admin-notifications";

export function ResendButton({ logId, dayNumber }: { logId: string; dayNumber: number }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const handle = async () => {
    const res = await adminResendNotification(logId);
    if (res.ok) {
      toast.show("재발송했어요", "success");
      router.refresh();
    } else {
      toast.show(res.error, "error");
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        재발송
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handle}
        title="알림을 재발송할까요?"
        description={`${dayNumber}일차 알림톡을 해당 사용자에게 다시 발송합니다. 실제 메시지가 전송됩니다.`}
        confirmLabel="재발송"
      />
    </>
  );
}
