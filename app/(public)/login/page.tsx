import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { SocialLoginButtons } from "./social-login-buttons";
import { EmailLoginForm } from "./email-login-form";
import { getCurrentUser } from "@/lib/supabase-server";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";

export const metadata: Metadata = {
  title: "로그인",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  // 이미 로그인된 사용자는 next 또는 /dashboard로 즉시 redirect
  const user = await getCurrentUser();
  if (user) {
    redirect(params.next ?? "/dashboard");
  }
  return (
    <PageFade className="flex-1 bg-gs-navy-50/40 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-[960px] grid items-center gap-10 lg:grid-cols-2">
        {/* 좌측 일러스트 — 데스크탑만 */}
        <FadeIn delay={0.1} y={16} className="hidden lg:flex items-center justify-center">
          <Image
            src="/illustrations/login-welcome.svg"
            alt=""
            width={400}
            height={400}
            className="w-[360px] xl:w-[400px] h-auto"
          />
        </FadeIn>

        {/* 우측 카드 */}
        <FadeIn delay={0} y={16}>
          <div className="bg-white w-full max-w-[480px] mx-auto px-8 py-10 rounded-toss-card shadow-toss-card-hover text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-gs-navy mb-3">
              다시 만나서 반가워요 👋
            </h1>
            <p className="text-sm md:text-base text-gs-muted-soft leading-[1.7] mb-7">
              소셜 계정으로 빠르게 시작하세요.
            </p>

            <div className="flex flex-col items-center gap-3">
              <SocialLoginButtons />
              <EmailLoginForm next={params.next} />
            </div>
          </div>
        </FadeIn>
      </div>
    </PageFade>
  );
}
