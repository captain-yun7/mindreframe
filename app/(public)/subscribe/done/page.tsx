import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { getLiveSubscription, MONTHLY_PRICE } from "@/lib/billing/subscription";

export const metadata: Metadata = {
  title: "월 구독 시작",
};

export const dynamic = "force-dynamic";

export default async function SubscribeDonePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mypage");
  const sub = await getLiveSubscription(user.id);
  if (!sub) redirect("/subscribe");

  const next = new Date(sub.current_period_end).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });

  return (
    <div className="min-h-screen bg-gs-navy-50/40">
      <div className="max-w-[480px] mx-auto px-5 pt-14 md:pt-20 pb-20 text-center">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em] mb-3">월 구독이 시작됐어요</h1>
        <p className="text-sm text-gs-text-soft leading-[1.65]">
          첫 달 {MONTHLY_PRICE.toLocaleString()}원이 결제됐어요.
          <br />
          다음 결제일은 {next}이에요. 해지는 마이페이지에서 언제든 할 수 있어요.
        </p>
        <div className="mt-7 flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1 py-3.5 rounded-toss-button bg-gs-navy-bright text-white text-sm font-bold shadow-toss-card hover:-translate-y-0.5 hover:shadow-toss-card-hover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40 focus-visible:ring-offset-2"
          >
            오늘의 루틴으로
          </Link>
          <Link
            href="/mypage"
            className="flex-1 py-3.5 rounded-toss-button border border-gs-line-mid bg-white text-sm font-bold text-gs-text-soft hover:bg-gs-navy-50 hover:-translate-y-0.5 hover:shadow-toss-card transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40 focus-visible:ring-offset-2"
          >
            마이페이지
          </Link>
        </div>
      </div>
    </div>
  );
}
