"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { adminDeactivateCoupon } from "@/lib/actions/admin-coupons";

export function DeactivateCouponButton({ code }: { code: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const handleClick = () => {
    if (!confirm(`쿠폰 ${code}을(를) 비활성화할까요?`)) return;
    startTransition(async () => {
      const r = await adminDeactivateCoupon(code);
      toast.show(r.ok ? "비활성화됨" : r.error, r.ok ? "success" : "error");
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-xs text-gs-danger hover:underline disabled:opacity-50"
    >
      비활성화
    </button>
  );
}
