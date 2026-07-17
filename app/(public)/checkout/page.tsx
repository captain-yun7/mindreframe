import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { createOrder } from "@/lib/actions/payments";
import { getPlanSpec } from "@/lib/payments/plans";
import { CheckoutWidget } from "./checkout-widget";
import { getSiteSettings } from "@/lib/site-settings";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";

export const metadata: Metadata = {
  title: "결제",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const spec = await getPlanSpec(plan);
  if (!spec) redirect("/pricing");

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/checkout?plan=${spec.slug}`);

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) {
    return (
      <div className="min-h-screen bg-gs-navy-50/40">
        <div className="max-w-[640px] mx-auto px-5 pt-12 pb-20">
          <div role="alert" className="px-4 py-3 rounded-toss-button bg-gs-warning-bg border border-gs-warning-border text-gs-warning text-sm">
            결제 모듈이 설정되지 않았습니다. 관리자에게 문의해주세요.
          </div>
        </div>
      </div>
    );
  }

  const settings = await getSiteSettings();
  const contactEmail = settings.contact_email || "";

  const order = await createOrder(spec.slug);
  if (!order.ok) {
    return (
      <div className="min-h-screen bg-gs-navy-50/40">
        <div className="max-w-[640px] mx-auto px-5 pt-12 pb-20">
          <div role="alert" className="px-4 py-3 rounded-toss-button bg-gs-warning-bg border border-gs-warning-border text-gs-warning text-sm">
            {order.error}
          </div>
          <Link href="/pricing" className="mt-4 inline-block text-sm font-bold text-gs-navy-bright hover:underline">
            요금제로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PageFade className="min-h-screen bg-gs-navy-50/40">
      <div className="max-w-[640px] mx-auto px-5 pt-12 md:pt-16 pb-20">
        <FadeIn>
          <div className="text-center mb-8">
            <p className="text-sm font-bold tracking-[-0.01em] text-gs-navy-bright mb-3">
              결제하기
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-gs-navy leading-[1.15] mb-4">
              {spec.name} 플랜
            </h1>
            <div className="inline-flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-[-0.03em]">
                {spec.amount.toLocaleString()}
              </span>
              <span className="text-sm text-gs-muted-soft">원 / {spec.durationDays}일</span>
            </div>
          </div>
        </FadeIn>

        <FadeIn>
          <div
            role="alert"
            className="mb-6 px-4 py-3 rounded-toss-button bg-gs-warning-bg border border-gs-warning-border text-gs-warning text-sm text-center leading-[1.6]"
          >
            현재 결제가 원활하지 않습니다.
            <br />
            결제를 원하시는 분께서는 문자 주세요.
            <br />
            <a href="sms:010-8199-3403" className="font-bold underline">
              010-8199-3403
            </a>
          </div>
        </FadeIn>

        <FadeIn>
          <div className="bg-white rounded-toss-card p-6 shadow-toss-card">
            <CheckoutWidget
              clientKey={clientKey}
              orderId={order.orderId}
              orderName={order.orderName}
              amount={order.amount}
              customerEmail={order.customerEmail}
              customerName={order.customerName}
            />
          </div>
        </FadeIn>

        <p className="mt-6 text-center text-xs text-gs-muted-light leading-[1.6]">
          결제 후 7일 이내, 콘텐츠 미사용 상태일 경우 환불 불가합니다.
          <br />
          결제 관련 문의가 있으시면 언제든 연락주세요
          <br />
          {contactEmail ? (
            <a href={`mailto:${contactEmail}`} className="text-gs-navy-bright font-bold hover:underline">
              {contactEmail}
            </a>
          ) : null}
          <br />
          <Link href="/pricing" className="text-gs-navy-bright font-bold hover:underline">
            플랜 다시 선택하기
          </Link>
        </p>
      </div>
    </PageFade>
  );
}
