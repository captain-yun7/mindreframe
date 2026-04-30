"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpAnonymousWithNickname } from "@/lib/actions/signup";
import { useToast } from "@/components/ui/toast";

export default function SignupPage() {
  const router = useRouter();
  const toast = useToast();
  const [nickname, setNickname] = useState("");
  const [isPending, startTransition] = useTransition();
  const [oauthFallback, setOauthFallback] = useState(false);

  function handleStart() {
    const trimmed = nickname.trim();
    if (!trimmed) {
      toast.show("이름이나 닉네임을 입력해주세요.", "error");
      return;
    }

    startTransition(async () => {
      const result = await signUpAnonymousWithNickname(trimmed);
      if (!result.ok) {
        toast.show(result.error, "error");
        if ("anonymousDisabled" in result && result.anonymousDisabled) {
          setOauthFallback(true);
        }
        return;
      }
      toast.show(`환영해요, ${trimmed}님!`, "success");
      router.push("/survey/intro");
      router.refresh();
    });
  }

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,#0e1430_0%,#1b2f86_45%,#2343e9_100%)] text-white px-6">
      <div className="max-w-[520px] w-full text-center">
        <h1 className="text-[42px] max-[480px]:text-[32px] font-extrabold leading-[1.4] mb-7">
          지금 떠오른 그 생각,
          <br />
          <span className="text-gs-gold">사실일 필요는 없습니다.</span>
        </h1>

        <p className="text-[17px] text-[#e5e7ff] mb-9 leading-[1.6]">
          우울·불안은 성격이 아니라
          <br />
          <b>생각습관</b>입니다.
        </p>

        <div className="flex flex-col gap-3.5">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isPending && handleStart()}
            placeholder="어떻게 불러드릴까요?"
            disabled={isPending}
            maxLength={30}
            className="w-full py-4 px-[18px] rounded-[14px] border-none text-[16px] text-[#111827] outline-none placeholder:text-[#9ca3af] disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleStart}
            disabled={isPending}
            className="py-4 rounded-full border-none text-[17px] font-bold bg-gs-gold text-[#111827] cursor-pointer shadow-[0_10px_30px_rgba(250,204,107,0.4)] hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? "준비 중..." : "바로 시작하기"}
          </button>
        </div>

        {oauthFallback && (
          <div
            role="alert"
            className="mt-5 rounded-[14px] bg-white/10 border border-white/20 p-4 text-left text-[14px] leading-[1.7]"
          >
            <p className="font-bold mb-1">익명 가입을 사용할 수 없어요.</p>
            <p className="text-white/80 mb-3">
              소셜 계정으로 로그인하시면 모든 기능을 동일하게 이용하실 수 있어요.
            </p>
            <Link
              href="/login"
              className="inline-block py-2.5 px-5 rounded-full bg-gs-gold text-[#111827] font-bold text-[14px]"
            >
              로그인 페이지로 이동
            </Link>
          </div>
        )}

        <p className="mt-4 text-[13px] text-[#d1d5db]">
          로그인 없이 바로 시작할 수 있어요
        </p>
      </div>
    </div>
  );
}
