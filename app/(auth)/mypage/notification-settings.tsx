"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import {
  updateNotificationHour,
  updatePhoneNumber,
} from "@/lib/actions/notifications";

interface Props {
  initialHour: number;
  initialPhone: string | null;
  notificationsActive: boolean;
}

/**
 * F155 알림 시간 + F217 사용자 휴대폰 직접 입력.
 * 결제 외 경로로도 등록 가능. 등록 시점에 알림 시작일이 자동 설정됨(영상 일차 카운트용).
 */
export function NotificationSettings({
  initialHour,
  initialPhone,
  notificationsActive,
}: Props) {
  const [hour, setHour] = useState(initialHour);
  const [phone, setPhone] = useState(formatPhoneInput(initialPhone ?? ""));
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const phoneRegistered = !!initialPhone;

  function handleSaveHour() {
    startTransition(async () => {
      const r = await updateNotificationHour(hour);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("발송 시간을 변경했어요", "success");
    });
  }

  function handleSavePhone() {
    startTransition(async () => {
      const r = await updatePhoneNumber(phone);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show(
        phoneRegistered
          ? "휴대폰 번호를 변경했어요"
          : "휴대폰 번호를 저장했어요. 매일 알림이 발송돼요.",
        "success",
      );
    });
  }

  const cleanedInput = phone.replace(/[^0-9]/g, "");
  const phoneValid = /^01[0-9]{8,9}$/.test(cleanedInput);
  const phoneChanged = cleanedInput !== (initialPhone ?? "");

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[13px] text-gs-muted mb-1.5">
          휴대폰 번호
        </label>
        <div className="flex items-center gap-2">
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            disabled={pending}
            placeholder="010-1234-5678"
            maxLength={13}
            className="flex-1 px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm focus:outline-none focus:ring-2 focus:ring-gs-blue/40"
          />
          <button
            type="button"
            onClick={handleSavePhone}
            disabled={pending || !phoneValid || !phoneChanged}
            className="px-4 py-2 rounded-[10px] bg-gs-blue text-white text-xs font-bold disabled:opacity-40 shrink-0"
          >
            {phoneRegistered ? "변경" : "저장"}
          </button>
        </div>
        {!phoneRegistered && (
          <p className="mt-1.5 text-[11px] text-gs-muted">
            등록하시면 매일 카카오 알림톡으로 영상·루틴 안내가 발송돼요.
          </p>
        )}
      </div>

      <div className="border-t border-gs-line-soft pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-gs-muted">알림 발송 시간</span>
          <div className="flex items-center gap-2">
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              disabled={pending || !phoneRegistered}
              className="px-2 py-1 rounded-[8px] border border-gs-line-soft text-sm disabled:opacity-50"
            >
              {Array.from({ length: 13 }, (_, i) => i + 8).map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, "0")}:00
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSaveHour}
              disabled={pending || hour === initialHour || !phoneRegistered}
              className="px-3 py-1 rounded-[8px] bg-gs-blue text-white text-xs font-bold disabled:opacity-40"
            >
              저장
            </button>
          </div>
        </div>
        {phoneRegistered && !notificationsActive && (
          <p className="mt-2 text-[11px] text-gs-muted">
            알림은 결제 완료 후 시작돼요.
          </p>
        )}
      </div>
    </div>
  );
}

/** 010-1234-5678 형식으로 표시. 숫자 8자리 이하면 가운데 4자리, 그 이상이면 끝 4자리. */
function formatPhoneInput(raw: string): string {
  const d = raw.replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10)
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
