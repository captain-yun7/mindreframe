"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { redeemCoupon } from "@/lib/actions/coupons";

export function CouponRedeemForm() {
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await redeemCoupon(code);
      if (r.ok) {
        toast.show("쿠폰이 적용됐어요!", "success");
        setCode("");
        router.refresh();
      } else {
        toast.show(r.error, "error");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-[480px] mx-auto mt-8 bg-white border border-gs-line-soft rounded-[18px] p-5 shadow-gs-card"
    >
      <label className="text-sm font-bold block mb-2">쿠폰 코드</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="WELCOME7"
          maxLength={40}
          className="flex-1 px-3 py-2 rounded-[10px] border border-gs-line-soft font-mono"
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="px-4 py-2 rounded-[10px] bg-gs-blue text-white text-sm font-bold disabled:opacity-50"
        >
          {pending ? "적용 중…" : "쿠폰 적용"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-gs-muted">
        쿠폰 코드를 입력하면 해당 플랜이 즉시 활성화됩니다.
      </p>
    </form>
  );
}
