"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { updateNotificationHour } from "@/lib/actions/notifications";

interface Props {
  initialHour: number;
  phoneRegistered: boolean;
  notificationsActive: boolean;
}

export function NotificationSettings({
  initialHour,
  phoneRegistered,
  notificationsActive,
}: Props) {
  const [hour, setHour] = useState(initialHour);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleSave() {
    startTransition(async () => {
      const r = await updateNotificationHour(hour);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("발송 시간을 변경했어요", "success");
    });
  }

  if (!phoneRegistered) {
    return (
      <p className="text-xs text-gs-muted">
        결제 시 등록한 휴대폰 번호로 매일 발송돼요. 아직 휴대폰이 등록되지 않았어요.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-gs-muted">알림 발송 시간</span>
        <div className="flex items-center gap-2">
          <select
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            disabled={pending}
            className="px-2 py-1 rounded-[8px] border border-gs-line-soft text-sm"
          >
            {Array.from({ length: 13 }, (_, i) => i + 8).map((h) => (
              <option key={h} value={h}>
                {h.toString().padStart(2, "0")}:00
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || hour === initialHour}
            className="px-3 py-1 rounded-[8px] bg-gs-blue text-white text-xs font-bold disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </div>
      {!notificationsActive && (
        <p className="text-[11px] text-gs-muted">
          알림은 결제 완료 후 시작돼요.
        </p>
      )}
    </div>
  );
}
