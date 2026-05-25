"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { updateCoachViewConsent } from "@/lib/actions/profile";

/**
 * F82 — 상담사 행동연습장 열람 동의 토글.
 * OFF 기본값, 옵티미스틱 업데이트 + 실패 시 롤백.
 */
export function CoachViewConsentToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState<boolean>(initial);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const handleToggle = () => {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const r = await updateCoachViewConsent(next);
      if (!r.ok) {
        setOn(!next);
        toast.show(r.error, "error");
      } else {
        toast.show(next ? "열람 허용으로 변경" : "열람 비허용으로 변경", "success");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      aria-pressed={on}
      data-testid="coach-view-consent-toggle"
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-bold transition-colors disabled:opacity-50 ${
        on
          ? "bg-gs-blue text-white"
          : "bg-white border border-gs-line-soft text-gs-text-soft"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${on ? "bg-white" : "bg-gs-muted"}`}
        aria-hidden
      />
      {on ? "허용 중" : "허용하지 않음"}
    </button>
  );
}
