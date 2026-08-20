"use client";

import { useState, useTransition } from "react";
import { updatePhoneNumber } from "@/lib/actions/notifications";

/** 결제 완료 직후 알림톡 수신용 휴대폰 등록 (미등록 유저에게만 노출). */
export function PhoneRegister() {
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState<false | "now" | "tomorrow">(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="mt-5 px-4 py-3 rounded-toss-button bg-gs-success-bg text-sm text-left leading-[1.6]">
        {done === "tomorrow"
          ? "✅ 등록 완료! 저녁 시간이라 1일차 훈련 알림톡은 내일 아침에 시작돼요."
          : "✅ 등록 완료! 1일차 훈련 알림톡이 곧 도착하고, 내일부터 매일 아침 발송돼요."}
      </div>
    );
  }

  return (
    <div className="mt-5 bg-white rounded-toss-card p-5 shadow-toss-card text-left">
      <p className="text-sm font-bold text-gs-navy mb-1">
        📮 매일 아침 훈련 알림톡 받기
      </p>
      <p className="text-xs text-gs-muted leading-[1.6] mb-3">
        휴대폰 번호를 등록하면 100일 훈련 안내를 카카오 알림톡으로 보내드려요.
        (18시 이후 등록 시 1일차는 다음날 아침부터 시작돼요)
      </p>
      <div className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01012345678"
          disabled={pending}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-toss-button border border-gs-line-mid text-sm focus:outline-none focus:ring-2 focus:ring-gs-navy-bright/40"
          aria-label="휴대폰 번호"
        />
        <button
          type="button"
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await updatePhoneNumber(phone);
              if (!r.ok) {
                setError(r.error);
                return;
              }
              setDone(r.startsTomorrow ? "tomorrow" : "now");
            });
          }}
          disabled={pending || !phone.trim()}
          className="shrink-0 px-4 py-2.5 rounded-toss-button bg-gs-navy-bright text-white text-sm font-bold disabled:opacity-50"
        >
          등록
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-gs-danger">
          {error}
        </p>
      )}
    </div>
  );
}
