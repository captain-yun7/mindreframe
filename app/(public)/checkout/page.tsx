import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { createOrder } from "@/lib/actions/payments";
import { getPlanSpec } from "@/lib/payments/plans";
import { CheckoutWidget } from "./checkout-widget";

export const metadata: Metadata = {
  title: "결제",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const spec = getPlanSpec(plan);
  if (!spec) redirect("/pricing");

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/checkout?plan=${spec.slug}`);

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) {
    return (
      <div className="min-h-screen bg-gs-surface-muted">
        <div className="max-w-[640px] mx-auto px-5 pt-10 pb-20">
          <div role="alert" className="px-4 py-3 rounded-xl bg-gs-warning-bg border border-gs-warning-border text-gs-warning text-sm">
            결제 모듈이 설정되지 않았습니다. 관리자에게 문의해주세요.
          </div>
        </div>
      </div>
    );
  }

  const order = await createOrder(spec.slug);
  if (!order.ok) {
    return (
      <div className="min-h-screen bg-gs-surface-muted">
        <div className="max-w-[640px] mx-auto px-5 pt-10 pb-20">
          <div role="alert" className="px-4 py-3 rounded-xl bg-gs-warning-bg border border-gs-warning-border text-gs-warning text-sm">
            {order.error}
          </div>
          <Link href="/pricing" className="mt-4 inline-block text-sm font-bold text-gs-blue hover:text-gs-blue-hover">
            요금제로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gs-surface-muted">
      <div className="max-w-[640px] mx-auto px-5 pt-8 pb-20">
        <div className="text-center mb-6">
          <p className="text-[13px] font-semibold text-gs-muted-soft mb-2">결제하기</p>
          <h1 className="text-2xl font-extrabold leading-[1.45] mb-3">{spec.name} 플랜</h1>
          <div className="inline-flex items-baseline gap-1">
            <span className="text-3xl font-black">{spec.amount.toLocaleString()}</span>
            <span className="text-sm text-gs-muted-soft">원 / {spec.durationDays}일</span>
          </div>
        </div>

        <div className="bg-white rounded-[18px] p-5 shadow-gs-card">
          <CheckoutWidget
            clientKey={clientKey}
            orderId={order.orderId}
            orderName={order.orderName}
            amount={order.amount}
            customerEmail={order.customerEmail}
            customerName={order.customerName}
          />
        </div>

        <p className="mt-6 text-center text-xs text-gs-muted-light leading-[1.6]">
          7일 내 콘텐츠 미사용 시 전액 환불, 사용 후엔 일할 계산됩니다.
          <br />
          <Link href="/pricing" className="text-gs-blue font-bold hover:text-gs-blue-hover">
            플랜 다시 선택하기
          </Link>
        </p>
      </div>
    </div>
  );
}
