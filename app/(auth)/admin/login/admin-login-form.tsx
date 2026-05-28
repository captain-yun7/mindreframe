"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { adminLogin, type AdminLoginResult } from "@/lib/actions/admin-login";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3.5 rounded-toss-button bg-gs-navy text-white font-bold text-base shadow-toss-card hover:-translate-y-0.5 hover:shadow-toss-card-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-gold/50 focus-visible:ring-offset-2"
    >
      {pending ? "로그인 중…" : "관리자 로그인"}
    </button>
  );
}

export function AdminLoginForm() {
  const [state, formAction] = useActionState<AdminLoginResult | null, FormData>(
    adminLogin,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-gs-navy">이메일</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="admin@mindreframe.net"
          className="px-4 py-3 rounded-toss-card border border-gs-line-soft bg-white text-base focus:outline-none focus:border-gs-navy focus:ring-2 focus:ring-gs-gold/30 transition-all"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-gs-navy">비밀번호</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="px-4 py-3 rounded-toss-card border border-gs-line-soft bg-white text-base focus:outline-none focus:border-gs-navy focus:ring-2 focus:ring-gs-gold/30 transition-all"
        />
      </label>

      {state && !state.ok ? (
        <div
          role="alert"
          className="px-3 py-2.5 rounded-toss-card bg-red-50 border border-red-200 text-sm text-red-700 font-medium"
        >
          {state.error}
        </div>
      ) : null}

      <div className="mt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
