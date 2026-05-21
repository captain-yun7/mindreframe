"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import type { Plan } from "@/lib/auth/plan";
import {
  adminUpdateUserPlan,
  adminUpdateUserRole,
  adminUpdateUserNotification,
} from "@/lib/actions/admin-users";

interface Props {
  userId: string;
  currentPlan: string;
  currentRole: string;
  currentNotificationHour: number;
  notificationsActive: boolean;
}

const PLANS: Plan[] = ["free", "light", "pro", "premium"];
const ROLES = ["user", "coach", "admin"] as const;

export function AdminUserActions({
  userId,
  currentPlan,
  currentRole,
  currentNotificationHour,
  notificationsActive,
}: Props) {
  const [plan, setPlan] = useState<Plan>(currentPlan as Plan);
  const [days, setDays] = useState<number>(100);
  const [role, setRole] = useState<"user" | "coach" | "admin">(
    currentRole as "user" | "coach" | "admin",
  );
  const [hour, setHour] = useState<number>(currentNotificationHour);
  const [active, setActive] = useState<boolean>(notificationsActive);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

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

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-gs-muted">플랜</span>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as Plan)}
          disabled={pending}
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
          disabled={pending}
          className="w-20 px-2 py-1 rounded border border-gs-line-soft"
        />
        <span className="text-xs text-gs-muted">일</span>
        <button
          onClick={handlePlan}
          disabled={pending}
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
          disabled={pending}
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
          disabled={pending}
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
          disabled={pending}
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
            disabled={pending}
          />
          활성
        </label>
        <button
          onClick={handleNotif}
          disabled={pending}
          className="px-3 py-1 rounded bg-gs-blue text-white text-xs font-bold disabled:opacity-50"
        >
          알림 설정
        </button>
      </div>
    </div>
  );
}
