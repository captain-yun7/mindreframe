"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import type { Plan } from "@/lib/auth/plan";
import {
  adminUpdateUserPlan,
  adminUpdateUserRole,
  adminUpdateUserNotification,
  adminUpdateUserNickname,
  adminUpdateUserTelegramChatId,
} from "@/lib/actions/admin-users";

interface Props {
  userId: string;
  currentPlan: string;
  currentRole: string;
  currentNickname: string;
  currentNotificationHour: number;
  notificationsActive: boolean;
  isDeleted?: boolean;
  currentTelegramChatId?: string | null;
}

const PLANS: Plan[] = ["free", "light", "pro", "premium"];
const ROLES = ["user", "coach", "admin"] as const;

export function AdminUserActions({
  userId,
  currentPlan,
  currentRole,
  currentNickname,
  currentNotificationHour,
  notificationsActive,
  isDeleted,
  currentTelegramChatId,
}: Props) {
  const [nickname, setNickname] = useState<string>(currentNickname);
  const [plan, setPlan] = useState<Plan>(currentPlan as Plan);
  const [days, setDays] = useState<number>(100);
  const [role, setRole] = useState<"user" | "coach" | "admin">(
    currentRole as "user" | "coach" | "admin",
  );
  const [hour, setHour] = useState<number>(currentNotificationHour);
  const [active, setActive] = useState<boolean>(notificationsActive);
  const [telegramChatId, setTelegramChatId] = useState<string>(
    currentTelegramChatId ?? "",
  );
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const handleNickname = () => {
    startTransition(async () => {
      const r = await adminUpdateUserNickname(userId, nickname);
      toast.show(r.ok ? "닉네임 변경 완료" : r.error, r.ok ? "success" : "error");
    });
  };

  const handlePlan = () => {
    startTransition(async () => {
      const r = await adminUpdateUserPlan(userId, plan, days);
      toast.show(r.ok ? "플랜 변경 완료" : r.error, r.ok ? "success" : "error");
    });
  };

  const handleRole = () => {
    if (!confirm(`권한을 ${role}로 변경할까요?`)) return;
    startTransition(async () => {
      const r = await adminUpdateUserRole(userId, role);
      toast.show(r.ok ? "권한 변경 완료" : r.error, r.ok ? "success" : "error");
    });
  };

  const handleNotif = () => {
    startTransition(async () => {
      const r = await adminUpdateUserNotification(userId, hour, active);
      toast.show(r.ok ? "알림 설정 변경 완료" : r.error, r.ok ? "success" : "error");
    });
  };

  const handleTelegram = () => {
    startTransition(async () => {
      const r = await adminUpdateUserTelegramChatId(
        userId,
        telegramChatId.trim() || null,
      );
      toast.show(
        r.ok ? "텔레그램 chat_id 저장됨" : r.error,
        r.ok ? "success" : "error",
      );
    });
  };

  const disabled = pending || !!isDeleted;
  const showTelegram = role === "coach" || role === "admin";

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-gs-muted">닉네임</span>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={disabled}
          maxLength={30}
          className="px-2 py-1 rounded border border-gs-line-soft w-48"
          aria-label="닉네임"
        />
        <button
          onClick={handleNickname}
          disabled={disabled || nickname.trim() === currentNickname || !nickname.trim()}
          className="px-3 py-1 rounded bg-gs-blue text-white text-xs font-bold disabled:opacity-50"
        >
          닉네임 변경
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-gs-muted">플랜</span>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as Plan)}
          disabled={disabled}
          className="px-2 py-1 rounded border border-gs-line-soft"
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="text-xs text-gs-muted">+</span>
        <input
          type="number"
          min={0}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          disabled={disabled}
          className="w-20 px-2 py-1 rounded border border-gs-line-soft"
        />
        <span className="text-xs text-gs-muted">일</span>
        <button
          onClick={handlePlan}
          disabled={disabled}
          className="px-3 py-1 rounded bg-gs-blue text-white text-xs font-bold disabled:opacity-50"
        >
          플랜 변경
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-gs-muted">권한</span>
        <select
          value={role}
          onChange={(e) =>
            setRole(e.target.value as "user" | "coach" | "admin")
          }
          disabled={disabled}
          className="px-2 py-1 rounded border border-gs-line-soft"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          onClick={handleRole}
          disabled={disabled}
          className="px-3 py-1 rounded bg-gs-blue text-white text-xs font-bold disabled:opacity-50"
        >
          권한 변경
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-gs-muted">알림</span>
        <select
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          disabled={disabled}
          className="px-2 py-1 rounded border border-gs-line-soft"
        >
          {Array.from({ length: 13 }, (_, i) => i + 8).map((h) => (
            <option key={h} value={h}>
              {h.toString().padStart(2, "0")}:00
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={disabled}
          />
          활성
        </label>
        <button
          onClick={handleNotif}
          disabled={disabled}
          className="px-3 py-1 rounded bg-gs-blue text-white text-xs font-bold disabled:opacity-50"
        >
          알림 설정
        </button>
      </div>

      {showTelegram && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-gs-muted">텔레그램</span>
          <input
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            disabled={disabled}
            placeholder="chat_id (숫자/-숫자)"
            className="px-2 py-1 rounded border border-gs-line-soft w-48"
            aria-label="텔레그램 chat_id"
          />
          <button
            onClick={handleTelegram}
            disabled={disabled}
            className="px-3 py-1 rounded bg-gs-blue text-white text-xs font-bold disabled:opacity-50"
          >
            chat_id 저장
          </button>
          <span className="text-[10px] text-gs-muted">
            사용자 발화 시 코치 텔레그램에 알림 전송
          </span>
        </div>
      )}
    </div>
  );
}
