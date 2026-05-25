"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { signUpAnonymousWithNickname } from "@/lib/actions/signup";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";

export default function SignupPage() {
  // 이미 로그인된 사용자는 /dashboard로 즉시 이동
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        window.location.replace("/dashboard");
      }
    });
  }, []);
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
      router.push("/survey");
      router.refresh();
    });
  }

  return (
    <PageFade className="flex-1 min-h-screen flex items-center justify-center bg-gradient-to-br from-gs-navy via-gs-navy-mid to-gs-navy-bright text-white px-6 py-12">
      <div className="max-w-[1000px] w-full grid items-center gap-10 lg:grid-cols-2">
        {/* 좌측 일러스트 */}
        <FadeIn delay={0.1} y={16} className="hidden lg:flex items-center justify-center">
          <Image
            src="/illustrations/login-welcome.svg"
            alt=""
            width={420}
            height={420}
            className="w-[360px] xl:w-[420px] h-auto"
          />
        </FadeIn>

        {/* 우측 콘텐츠 */}
        <FadeIn delay={0} y={16} className="text-center lg:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-[-0.03em] leading-[1.15] mb-6">
            함께 시작해봐요 🌱
            <br />
            <span className="text-gs-gold">사실일 필요는 없어요</span>
          </h1>

          <p className="text-base md:text-lg text-white/80 mb-8 leading-[1.65]">
            우울·불안은 성격이 아니라 <b className="text-white">생각습관</b>이에요.
            <br />
            지금 떠오른 그 생각, 한번 살펴봐요.
          </p>

          <div className="flex flex-col gap-3 max-w-[420px] mx-auto lg:mx-0">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isPending && handleStart()}
              placeholder="어떻게 불러드릴까요?"
              disabled={isPending}
              maxLength={30}
              className="w-full py-4 px-5 rounded-toss-button border-2 border-white/30 bg-white/10 text-base text-white outline-none focus:border-gs-gold focus:ring-4 focus:ring-gs-gold/40 placeholder:text-white/50 disabled:opacity-60 transition-colors"
            />
            <button
              type="button"
              onClick={handleStart}
              disabled={isPending}
              className="py-4 rounded-toss-button text-base font-bold bg-gs-gold text-gs-text-strong cursor-pointer shadow-[0_10px_30px_rgba(250,204,107,0.4)] hover:-translate-y-0.5 hover:brightness-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gs-gold/50"
            >
              {isPending ? "준비 중..." : "바로 시작하기"}
            </button>
          </div>

          {oauthFallback && (
            <div
              role="alert"
              className="mt-6 max-w-[420px] mx-auto lg:mx-0 rounded-toss-card bg-white/10 border border-white/20 p-4 text-left text-sm leading-[1.7]"
            >
              <p className="font-bold mb-1">익명 가입을 사용할 수 없어요.</p>
              <p className="text-white/80 mb-3">
                소셜 계정으로 로그인하시면 모든 기능을 동일하게 이용하실 수 있어요.
              </p>
              <Link
                href="/login"
                className="inline-block py-2.5 px-5 rounded-toss-button bg-gs-gold text-gs-text-strong font-bold text-sm hover:brightness-105 transition-all"
              >
                로그인 페이지로 이동
              </Link>
            </div>
          )}

          <p className="mt-5 text-[13px] text-white/60 text-center lg:text-left">
            로그인 없이 바로 시작할 수 있어요
          </p>
        </FadeIn>
      </div>
    </PageFade>
  );
}
