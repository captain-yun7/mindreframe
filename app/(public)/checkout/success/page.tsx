import type { Metadata } from "next";
import Link from "next/link";
import { confirmOrder } from "@/lib/actions/payments";
import { getPlanSpec } from "@/lib/payments/plans";

export const metadata: Metadata = {
  title: "결제 완료",
};

const PLAN_LABEL: Record<string, string> = {
  light: "라이트",
  pro: "프로",
  premium: "프리미엄",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const { paymentKey, orderId, amount } = await searchParams;
  const numericAmount = amount ? Number(amount) : NaN;

  if (!paymentKey || !orderId || !Number.isFinite(numericAmount)) {
    return renderError("잘못된 접근입니다");
  }

  const result = await confirmOrder({
    paymentKey,
    orderId,
    amount: numericAmount,
  });

  if (!result.ok) return renderError(result.error);

  const spec = getPlanSpec(result.plan);
  const expires = result.expiresAt ? new Date(result.expiresAt) : null;
  const expiresText = expires
    ? `${expires.getFullYear()}.${String(expires.getMonth() + 1).padStart(2, "0")}.${String(expires.getDate()).padStart(2, "0")}`
    : "-";

  return (
    <div className="min-h-screen bg-gs-surface-muted">
      <div className="max-w-[480px] mx-auto px-5 pt-12 pb-20 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gs-success-bg flex items-center justify-center text-2xl">
          ✓
        </div>
        <h1 className="text-2xl font-extrabold mb-2">결제가 완료되었습니다</h1>
        <p className="text-sm text-gs-text-soft leading-[1.65] mb-6">
          {PLAN_LABEL[result.plan] ?? result.plan} 플랜이 활성화되었습니다.
        </p>

        <div className="bg-white rounded-[18px] p-5 shadow-gs-card text-left text-sm">
          <Row label="플랜" value={spec?.name ?? result.plan} />
          <Row label="결제 금액" value={`${spec?.amount.toLocaleString() ?? "-"}원`} />
          <Row label="이용 만료" value={expiresText} />
          <Row label="주문 번호" value={orderId} mono />
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1 py-3 rounded-[14px] bg-gs-blue text-white text-sm font-bold hover:bg-gs-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2"
          >
            대시보드로
          </Link>
          <Link
            href="/mypage"
            className="flex-1 py-3 rounded-[14px] border border-gs-line-mid bg-white text-sm font-bold text-gs-text-soft hover:bg-gs-surface-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2"
          >
            마이페이지
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gs-line-soft last:border-b-0">
      <span className="text-gs-muted-soft">{label}</span>
      <span className={`font-semibold ${mono ? "text-xs font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function renderError(message: string) {
  return (
    <div className="min-h-screen bg-gs-surface-muted">
      <div className="max-w-[480px] mx-auto px-5 pt-12 pb-20 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gs-warning-bg flex items-center justify-center text-2xl">
          !
        </div>
        <h1 className="text-2xl font-extrabold mb-2">결제 처리 실패</h1>
        <p role="alert" className="text-sm text-gs-text-soft leading-[1.65] mb-6">
          {message}
        </p>
        <Link
          href="/pricing"
          className="inline-block px-6 py-3 rounded-[14px] bg-gs-blue text-white text-sm font-bold hover:bg-gs-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2"
        >
          요금제로 돌아가기
        </Link>
      </div>
    </div>
  );
}
