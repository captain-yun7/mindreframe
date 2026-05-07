"use client";

import { useTransition } from "react";
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
  const router = useRouter();
  const toast = useToast();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await activateBetaPlan(plan);
          if (!r.ok) {
            toast.show(r.error, "error");
            return;
          }
          toast.show(`${plan.toUpperCase()} 플랜이 활성화되었습니다 (베타)`, "success");
          router.push("/dashboard");
          router.refresh();
        })
      }
      className={`w-full py-3 rounded-[14px] text-sm font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-wait ${
        recommended
          ? "bg-gs-blue text-white hover:bg-gs-blue-hover"
          : "bg-white border border-gs-line-mid text-gs-text-soft hover:bg-gs-surface-mid"
      }`}
    >
      {pending ? "활성화 중..." : label}
    </button>
  );
}
