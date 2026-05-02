import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "결제 실패",
};

export default async function CheckoutFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string; orderId?: string }>;
}) {
  const { code, message } = await searchParams;

  return (
    <div className="min-h-screen bg-gs-surface-muted">
      <div className="max-w-[480px] mx-auto px-5 pt-12 pb-20 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gs-warning-bg flex items-center justify-center text-2xl">
          !
        </div>
        <h1 className="text-2xl font-extrabold mb-2">결제가 취소되었습니다</h1>
        <p role="alert" className="text-sm text-gs-text-soft leading-[1.65] mb-2">
          {message ?? "결제가 정상 처리되지 않았습니다."}
        </p>
        {code && <p className="text-xs text-gs-muted-light mb-6">오류 코드: {code}</p>}

        <div className="mt-6 flex gap-3">
          <Link
            href="/pricing"
            className="flex-1 py-3 rounded-[14px] bg-gs-blue text-white text-sm font-bold hover:bg-gs-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2"
          >
            다시 시도
          </Link>
          <Link
            href="/"
            className="flex-1 py-3 rounded-[14px] border border-gs-line-mid bg-white text-sm font-bold text-gs-text-soft hover:bg-gs-surface-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
