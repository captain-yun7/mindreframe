import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SocialLoginButtons } from "./social-login-buttons";
import { getCurrentUser } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "로그인",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // 이미 로그인된 사용자는 next 또는 /dashboard로 즉시 redirect
  const user = await getCurrentUser();
  if (user) {
    const params = await searchParams;
    redirect(params.next ?? "/dashboard");
  }
  return (
    <div className="flex-1 bg-gs-bg flex items-center justify-center px-4 py-16">
      <div className="bg-white w-full max-w-[520px] px-7 py-8 rounded-[18px] shadow-gs-card-hover text-center">
        <h1 className="text-2xl font-black mb-2">로그인</h1>
        <p className="text-sm text-gs-muted-soft leading-[1.7] mb-6">
          소셜 계정으로 빠르게 시작하거나,
          <br />
          닉네임만으로 바로 이용해보실 수 있어요.
        </p>

        <div className="flex flex-col items-center gap-3">
          <SocialLoginButtons />

          <div className="flex items-center w-full max-w-[420px] my-2 gap-2 text-gs-muted-light text-xs">
            <span className="flex-1 h-px bg-gs-line-soft" />
            또는
            <span className="flex-1 h-px bg-gs-line-soft" />
          </div>

          <Link
            href="/signup"
            className="w-full max-w-[420px] py-3.5 rounded-full bg-gs-navy-bright text-white font-black text-base text-center block hover:brightness-105 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2"
          >
            닉네임으로 시작하기
          </Link>
        </div>

        <p className="mt-4 text-[13px] text-gs-muted-light">
          이미 진행 중인 기록은 <b>같은 기기</b>에서 이어집니다.
        </p>
      </div>
    </div>
  );
}
