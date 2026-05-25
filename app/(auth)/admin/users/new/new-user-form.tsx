"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { adminCreateUser } from "@/lib/actions/admin-users";
import type { Plan } from "@/lib/auth/plan";

const PLANS: Plan[] = ["free", "light", "pro", "premium"];

// crypto.getRandomValues 기반 임시 비번 생성 (Math.random 대비 충분한 엔트로피).
// 8자 base36 + "Mr"/"!1" 패턴 = 최소 12자, 영문 대/소문자 + 숫자 + 특수문자 포함.
function generateTempPassword(): string {
  const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let rand = "";
  for (let i = 0; i < bytes.length; i++) {
    rand += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `Mr${rand}!1`;
}

export function NewUserForm() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [expiresInDays, setExpiresInDays] = useState<number>(100);
  const [notificationHour, setNotificationHour] = useState<number>(9);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await adminCreateUser({
        email,
        nickname,
        password,
        plan,
        expiresInDays: plan === "free" ? null : expiresInDays,
        notificationHour,
      });
      if (r.ok) {
        toast.show("사용자가 생성되었어요", "success");
        router.push(`/admin/users/${r.userId}`);
      } else {
        toast.show(r.error, "error");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label className="w-24 text-gs-muted" htmlFor="email">
          이메일
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          className="flex-1 min-w-[200px] px-3 py-2 rounded border border-gs-line-soft"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="w-24 text-gs-muted" htmlFor="nickname">
          닉네임
        </label>
        <input
          id="nickname"
          type="text"
          required
          maxLength={30}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={pending}
          className="flex-1 min-w-[200px] px-3 py-2 rounded border border-gs-line-soft"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="w-24 text-gs-muted" htmlFor="password">
          임시 비밀번호
        </label>
        <input
          id="password"
          type="text"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          placeholder="8자 이상"
          className="flex-1 min-w-[200px] px-3 py-2 rounded border border-gs-line-soft font-mono"
        />
        <button
          type="button"
          onClick={() => setPassword(generateTempPassword())}
          disabled={pending}
          className="px-3 py-2 rounded border border-gs-line-soft text-xs"
        >
          자동 생성
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="w-24 text-gs-muted" htmlFor="plan">
          플랜
        </label>
        <select
          id="plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value as Plan)}
          disabled={pending}
          className="px-3 py-2 rounded border border-gs-line-soft"
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {plan !== "free" && (
          <>
            <span className="text-xs text-gs-muted">만료까지</span>
            <input
              type="number"
              min={1}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              disabled={pending}
              className="w-20 px-2 py-1 rounded border border-gs-line-soft"
            />
            <span className="text-xs text-gs-muted">일</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="w-24 text-gs-muted" htmlFor="notif-hour">
          알림 시간
        </label>
        <select
          id="notif-hour"
          value={notificationHour}
          onChange={(e) => setNotificationHour(Number(e.target.value))}
          disabled={pending}
          className="px-3 py-2 rounded border border-gs-line-soft"
        >
          {Array.from({ length: 13 }, (_, i) => i + 8).map((h) => (
            <option key={h} value={h}>
              {h.toString().padStart(2, "0")}:00
            </option>
          ))}
        </select>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending || !email || !nickname || password.length < 8}
          className="px-4 py-2 rounded-[10px] bg-gs-blue text-white text-sm font-bold disabled:opacity-50"
        >
          {pending ? "생성 중..." : "사용자 생성"}
        </button>
      </div>
    </form>
  );
}
