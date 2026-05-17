"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateBetaPlan } from "@/lib/actions/billing";
import { useToast } from "@/components/ui/toast";
import type { Plan } from "@/lib/auth/plan";

export function SelectPlanButton({
  plan,
  recommended,
  label = "선택하기",
}: {
  plan: Plan;
  recommended?: boolean;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [askPhone, setAskPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const router = useRouter();
  const toast = useToast();

  const isPaid = plan !== "free";

  function submit(phoneArg?: string) {
    startTransition(async () => {
      const r = await activateBetaPlan(plan, phoneArg);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show(`${plan.toUpperCase()} 플랜이 활성화되었습니다`, "success");
      router.push("/dashboard");
      router.refresh();
    });
  }

  function handleClick() {
    if (isPaid && !askPhone) {
      setAskPhone(true);
      return;
    }
    submit(isPaid ? phone : undefined);
  }

  return (
    <div className="w-full">
      {askPhone && isPaid && (
        <div className="mb-2 p-3 rounded-[12px] bg-gs-surface-muted border border-gs-line-soft">
          <label className="block text-[12px] text-gs-text-soft mb-1.5">
            매일 카카오 알림톡을 받을 휴대폰 번호
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01012345678"
            disabled={pending}
            className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm focus:outline-none focus:ring-2 focus:ring-gs-blue/40"
          />
        </div>
      )}
      <button
        type="button"
        disabled={pending || (askPhone && isPaid && !phone.trim())}
        onClick={handleClick}
        className={`w-full py-3 rounded-[14px] text-sm font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-wait ${
          recommended
            ? "bg-gs-blue text-white hover:bg-gs-blue-hover"
            : "bg-white border border-gs-line-mid text-gs-text-soft hover:bg-gs-surface-mid"
        }`}
      >
        {pending
          ? "활성화 중..."
          : askPhone && isPaid
            ? "휴대폰으로 시작하기"
            : label}
      </button>
    </div>
  );
}
