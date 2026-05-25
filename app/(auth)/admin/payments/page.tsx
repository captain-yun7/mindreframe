import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { Card } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import { RefundActionButton } from "./refund-action-button";

const PAGE_SIZE = 50;

interface PaymentRow {
  id: string;
  user_id: string;
  amount: number;
  plan: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  refunded_at: string | null;
  users?: { nickname: string; email: string } | null;
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));

  const { supabase } = await requireAdmin();

  // refunded_at 컬럼 미적용 환경 fallback
  const baseSelect =
    "id, user_id, amount, plan, status, paid_at, created_at, users:user_id (nickname, email)";

  async function fetchPayments(includeRefund: boolean) {
    let q = supabase
      .from("payments")
      .select(
        includeRefund ? `${baseSelect}, refunded_at` : baseSelect,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (status) q = q.eq("status", status);
    return q;
  }

  let res = (await fetchPayments(true)) as {
    data: unknown;
    count: number | null;
    error: { code?: string; message: string } | null;
  };
  if (
    res.error &&
    (res.error.code === "42703" || /refunded_at/.test(res.error.message))
  ) {
    res = (await fetchPayments(false)) as typeof res;
  }
  const data = res.data;
  const count = res.count;
  const payments = (data ?? []) as unknown as PaymentRow[];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return (
    <PageLayout>
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin" className="text-sm text-gs-blue">
          ← 대시보드
        </Link>
      </div>
      <PageTitle>결제 이력</PageTitle>
      <div className="text-xs text-gs-muted mb-4">
        총 {count ?? 0}건 · 현재 페이지 합계 {totalAmount.toLocaleString()}원
      </div>

      <Card className="p-4 mb-4">
        <div className="flex gap-2">
          {[
            { v: "", label: "전체" },
            { v: "paid", label: "완료" },
            { v: "pending", label: "대기" },
            { v: "failed", label: "실패" },
            { v: "refunded", label: "환불" },
          ].map((f) => (
            <Link
              key={f.v}
              href={`/admin/payments${f.v ? `?status=${f.v}` : ""}`}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                status === f.v
                  ? "bg-gs-blue text-white border-gs-blue"
                  : "bg-white text-gs-text-soft border-gs-line-soft"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </Card>

      <div className="bg-white rounded-[14px] border border-gs-line-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gs-surface-muted border-b border-gs-line-soft">
            <tr className="text-left text-xs text-gs-muted">
              <th className="px-3 py-2">사용자</th>
              <th className="px-3 py-2">플랜</th>
              <th className="px-3 py-2 text-right">금액</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">결제일</th>
              <th className="px-3 py-2 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gs-muted">
                  결제 없음
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gs-line-soft hover:bg-gs-surface-muted/50"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/users/${p.user_id}`}
                      className="text-gs-blue hover:underline"
                    >
                      {p.users?.nickname ?? "사용자"}
                    </Link>
                    <div className="text-[11px] text-gs-muted">
                      {p.users?.email}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs uppercase font-bold">{p.plan}</td>
                  <td className="px-3 py-2 text-right">
                    {p.amount.toLocaleString()}원
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={p.status} />
                    {p.refunded_at && (
                      <div className="text-[10px] text-gs-muted mt-0.5">
                        {new Date(p.refunded_at).toLocaleDateString("ko-KR")}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gs-muted">
                    {new Date(p.created_at).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {p.status === "paid" && !p.refunded_at && (
                      <RefundActionButton
                        paymentId={p.id}
                        amount={p.amount}
                        within7Days={within7Days(p.paid_at ?? p.created_at)}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} status={status} />}
    </PageLayout>
  );
}

function within7Days(date: string): boolean {
  return (Date.now() - new Date(date).getTime()) / 86_400_000 <= 7;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-gs-success-bg text-gs-success",
    pending: "bg-gs-warning-bg text-gs-warning",
    failed: "bg-gs-danger-bg text-gs-danger",
    refunded: "bg-gs-line-soft text-gs-muted",
  };
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${map[status] ?? "bg-gs-line-soft text-gs-muted"}`}
    >
      {status}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  status,
}: {
  page: number;
  totalPages: number;
  status: string;
}) {
  const buildHref = (p: number) =>
    `/admin/payments?${status ? `status=${status}&` : ""}page=${p}`;
  return (
    <div className="mt-4 flex gap-2 justify-center">
      {page > 1 && (
        <Link href={buildHref(page - 1)} className="px-3 py-1.5 rounded-[8px] border border-gs-line-soft text-sm">
          이전
        </Link>
      )}
      <span className="px-3 py-1.5 text-sm">{page} / {totalPages}</span>
      {page < totalPages && (
        <Link href={buildHref(page + 1)} className="px-3 py-1.5 rounded-[8px] border border-gs-line-soft text-sm">
          다음
        </Link>
      )}
    </div>
  );
}
