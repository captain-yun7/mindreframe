"use client";

import { useActionState } from "react";
import { emailLogin, type EmailLoginResult } from "@/lib/actions/email-login";

/**
 * 이메일 로그인 폼 — 소셜 버튼 아래 접힌 상태로 노출.
 * PG 심사·테스트 계정 등 Supabase Dashboard에서 생성한 계정 전용.
 */
export function EmailLoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<
    EmailLoginResult | null,
    FormData
  >(emailLogin, null);

  return (
    <details className="w-full mt-2 text-left">
      <summary className="text-[13px] text-gs-muted-soft text-center cursor-pointer hover:text-gs-text-soft transition-colors list-none">
        이메일로 로그인
      </summary>
      <form action={formAction} className="mt-4 flex flex-col gap-3">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="이메일"
          className="w-full h-12 px-4 rounded-toss-button border border-gs-line-mid text-sm focus:outline-none focus:ring-2 focus:ring-gs-navy-bright/40"
        />
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="비밀번호"
          className="w-full h-12 px-4 rounded-toss-button border border-gs-line-mid text-sm focus:outline-none focus:ring-2 focus:ring-gs-navy-bright/40"
        />
        {state && !state.ok ? (
          <p role="alert" className="text-xs text-gs-warning">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full h-12 rounded-toss-button bg-gs-navy-bright text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </details>
  );
}
