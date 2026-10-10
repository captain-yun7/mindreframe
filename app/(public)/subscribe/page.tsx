import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkEligibility, customerKeyFor, MONTHLY_PRICE } from "@/lib/billing/subscription";
import { RegisterCardButton } from "./register-card-button";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";

export const metadata: Metadata = {
  title: "월 구독",
};

export const dynamic = "force-dynamic";

const INCLUDED = [
  "가짜생각 분석기 하루 1회",
  "생각쓰레기통 하루 1회",
  "오늘의 루틴 · 알고가기",
  "행동연습장 · 명상하기 · 나의성장방",
];

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string }>;
}) {
  const { code, message } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/subscribe");

  const elig = await checkEligibility(user.id);
  if (!elig.eligible && elig.reason === "already_subscribed") redirect("/mypage");

  const clientKey = process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY ?? "";
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("email, nickname")
    .eq("id", user.id)
    .maybeSingle();
  const p = profile as { email: string | null; nickname: string | null } | null;

  return (
    <PageFade className="min-h-screen bg-gs-navy-50/40">
      <div className="max-w-[560px] mx-auto px-5 pt-12 md:pt-16 pb-20">
        <FadeIn>
          <div className="text-center mb-8">
            <p className="text-sm font-bold tracking-[-0.01em] text-gs-navy-bright mb-3">재구독 회원 전용</p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-gs-navy leading-[1.15] mb-4">
              월 구독
            </h1>
            <div className="inline-flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-[-0.03em]">{MONTHLY_PRICE.toLocaleString()}</span>
              <span className="text-sm text-gs-muted-soft">원 / 월</span>
            </div>
          </div>
        </FadeIn>

        <FadeIn>
          <div className="bg-white rounded-toss-card p-6 shadow-toss-card space-y-5">
            <ul className="space-y-2 text-sm text-gs-text-soft">
              {INCLUDED.map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden className="text-gs-navy-bright">✓</span>
                  {t}
                </li>
              ))}
              <li className="flex gap-2 text-gs-muted-light">
                <span aria-hidden>–</span>
                1:1 코치 채팅은 포함되지 않아요
              </li>
            </ul>

            {message && (
              <div role="alert" className="px-4 py-3 rounded-toss-button bg-gs-warning-bg border border-gs-warning-border text-gs-warning text-sm">
                {message}
                {code ? <span className="block text-xs mt-1 opacity-70">오류 코드: {code}</span> : null}
              </div>
            )}

            {elig.eligible && clientKey ? (
              <RegisterCardButton
                clientKey={clientKey}
                customerKey={customerKeyFor(user.id)}
                customerEmail={p?.email ?? user.email ?? null}
                customerName={p?.nickname ?? null}
                amount={MONTHLY_PRICE}
              />
            ) : (
              <div className="px-4 py-3 rounded-toss-button bg-gs-navy-50 text-sm text-gs-text-soft">
                {elig.eligible ? "월 구독 결제가 아직 준비되지 않았어요" : elig.message}
              </div>
            )}

            <p className="text-xs text-gs-muted-light leading-[1.7]">
              카드를 등록하면 오늘 첫 달 {MONTHLY_PRICE.toLocaleString()}원이 결제되고, 매달 같은 날 자동으로 결제돼요.
              <br />
              마이페이지에서 언제든 해지할 수 있고, 해지해도 이미 결제한 기간이 끝날 때까지 이용할 수 있어요.
            </p>
          </div>
        </FadeIn>

        <p className="mt-6 text-center text-xs text-gs-muted-light">
          <Link href="/pricing" className="text-gs-navy-bright font-bold hover:underline">
            요금제로 돌아가기
          </Link>
        </p>
      </div>
    </PageFade>
  );
}
