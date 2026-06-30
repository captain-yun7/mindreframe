"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/card";
import { useToast } from "@/components/ui/toast";
import { adminAdjustCoachSession } from "@/lib/actions/coach-chat";
import type { Plan } from "@/lib/auth/plan";

interface Props {
  userId: string;
  nickname: string | null;
  email: string | null;
  plan: Plan;
  planExpiresAt: string | null;
  createdAt: string | null;
  notificationsStartedAt: string | null;
  phoneNumber: string | null;
  notificationHour: number | null;
  dayNumber: number | null;
  usedThisWeek: number;
  weeklyLimit: number;
  adjustment: number;
  warning: "red" | null;
}

export function CoachUserInfoPanel(p: Props) {
  const [adj, setAdj] = useState(p.adjustment);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function bump(delta: 1 | -1) {
    startTransition(async () => {
      const r = await adminAdjustCoachSession(p.userId, delta);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      setAdj(r.next);
      toast.show(
        `횟수 조정 ${delta > 0 ? "+1" : "-1"} (현재 ${r.next})`,
        "success",
      );
    });
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold">{p.nickname ?? "사용자"}</div>
          <div className="text-xs text-gs-muted">{p.email ?? "-"}</div>
        </div>
        {p.warning === "red" && (
          <span title="플랜 미달" aria-label="플랜 미달" className="text-gs-danger text-lg">
            ⚠️
          </span>
        )}
      </div>

      <Row
        label="플랜"
        value={
          <>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gs-blue-light text-gs-blue font-bold uppercase">
              {p.plan}
            </span>
            {p.planExpiresAt && (
              <span className="text-xs text-gs-muted ml-2">
                ~{new Date(p.planExpiresAt).toLocaleDateString("ko-KR")}
              </span>
            )}
          </>
        }
      />
      <Row
        label="가입일"
        value={
          p.createdAt
            ? new Date(p.createdAt).toLocaleDateString("ko-KR")
            : "-"
        }
      />
      <Row
        label="100일 차수"
        value={p.dayNumber !== null ? `${p.dayNumber}/100` : "미시작"}
      />
      <Row
        label="휴대폰"
        value={p.phoneNumber ? formatPhone(p.phoneNumber) : "미등록"}
      />
      <Row
        label="알림 시간"
        value={
          p.notificationHour !== null
            ? `${p.notificationHour.toString().padStart(2, "0")}:00`
            : "미설정"
        }
      />

      <hr className="border-gs-line-soft" />

      <div className="text-xs font-bold">이번 주 코치 사용</div>
      <Row label="실 사용" value={`${p.usedThisWeek} / ${p.weeklyLimit}회`} />
      <Row
        label="수동 조정"
        value={
          <div className="flex items-center gap-2">
            <span>{adj > 0 ? `+${adj}` : adj}</span>
            <button
              type="button"
              onClick={() => bump(1)}
              disabled={pending}
              className="px-2 py-0.5 rounded bg-gs-blue text-white text-xs font-bold disabled:opacity-50"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => bump(-1)}
              disabled={pending}
              className="px-2 py-0.5 rounded bg-gs-surface-muted border border-gs-line-soft text-xs disabled:opacity-50"
            >
              -1
            </button>
          </div>
        }
      />
      <div className="text-[10px] text-gs-muted">
        * 양수 = 한도 추가 / 음수 = 차감. 한도 초과 시 새 세션 생성이 차단돼요.
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gs-muted">{label}</span>
      <span className="flex items-center">{value}</span>
    </div>
  );
}

function formatPhone(phone: string): string {
  // 010-1234-5678 형태로 보정 (저장이 raw 숫자만이거나 하이픈 포함 모두 대응)
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("010")) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
}
