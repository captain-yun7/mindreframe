import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeSearchTerm } from "@/lib/utils";
import { PageHeader } from "../_ui/page-header";
import { AdminTable, type Column } from "../_ui/admin-table";
import { Pagination } from "../_ui/pagination";
import { SearchFilterBar } from "../_ui/search-filter-bar";
import { MappedBadge } from "../_ui/status-badge";
import { PAYMENT_STATUS, planLabel } from "../_ui/lib/labels";
import { fmtDateTime, fmtMoney } from "../_ui/lib/fmt";

const PAGE_SIZE = 50;

interface PaymentRow {
  id: string;
  user_id: string;
  order_id: string;
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
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));
  const safeQ = sanitizeSearchTerm(q);

  await requireAdmin();

  // 검색: order_id ilike 또는 유저(email/nickname) 매칭 → user_id in
  let matchedUserIds: string[] = [];
  if (safeQ) {
    const { data: us } = await supabaseAdmin
      .from("users")
      .select("id")
      .or(`email.ilike.%${safeQ}%,nickname.ilike.%${safeQ}%`)
      .limit(500);
    matchedUserIds = ((us as { id: string }[]) ?? []).map((u) => u.id);
  }

  const baseSelect =
    "id, user_id, order_id, amount, plan, status, paid_at, created_at, users:user_id (nickname, email)";

  async function fetchPayments(includeRefund: boolean) {
    let qb = supabaseAdmin
      .from("payments")
      .select(includeRefund ? `${baseSelect}, refunded_at` : baseSelect, { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (status) qb = qb.eq("status", status);
    if (safeQ) {
      const ors = [`order_id.ilike.%${safeQ}%`];
      if (matchedUserIds.length > 0) ors.push(`user_id.in.(${matchedUserIds.join(",")})`);
      qb = qb.or(ors.join(","));
    }
    return qb;
  }

  let res = (await fetchPayments(true)) as {
    data: unknown;
    count: number | null;
    error: { code?: string; message: string } | null;
  };
  if (res.error && (res.error.code === "42703" || /refunded_at/.test(res.error.message))) {
    res = (await fetchPayments(false)) as typeof res;
  }
  const payments = (res.data ?? []) as unknown as PaymentRow[];
  const totalCount = res.count ?? 0;
  const pageAmount = payments
    .filter((p) => p.status === "paid" && !p.refunded_at)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const columns: Column<PaymentRow>[] = [
    {
      key: "user",
      header: "사용자",
      cell: (p) => (
        <Link href={`/admin/payments/${p.id}`} className="block">
          <span className="text-gs-blue font-bold hover:underline">
            {p.users?.nickname ?? "사용자"}
          </span>
          <div className="text-[11px] text-gs-muted">{p.users?.email}</div>
        </Link>
      ),
    },
    {
      key: "order",
      header: "주문번호",
      hideOnMobile: true,
      cell: (p) => <span className="font-mono text-[11px] text-gs-muted">{p.order_id}</span>,
    },
    { key: "plan", header: "플랜", cell: (p) => <span className="text-xs font-bold">{planLabel(p.plan)}</span> },
    { key: "amount", header: "금액", align: "right", cell: (p) => <span className="tabular-nums">{fmtMoney(p.amount)}</span> },
    {
      key: "status",
      header: "상태",
      cell: (p) => (
        <div>
          <MappedBadge value={p.status} map={PAYMENT_STATUS} />
          {p.refunded_at && (
            <div className="text-[10px] text-gs-muted mt-0.5">{fmtDateTime(p.refunded_at)}</div>
          )}
        </div>
      ),
    },
    { key: "created", header: "결제일", hideOnMobile: true, cell: (p) => <span className="text-xs text-gs-muted">{fmtDateTime(p.created_at)}</span> },
    {
      key: "manage",
      header: "",
      align: "right",
      cell: (p) => (
        <Link href={`/admin/payments/${p.id}`} className="text-xs font-bold text-gs-blue hover:underline">
          상세 →
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="결제 이력"
        desc={`총 ${totalCount.toLocaleString()}건 · 현재 페이지 실매출 ${fmtMoney(pageAmount)}`}
      />

      <SearchFilterBar
        action="/admin/payments"
        searchValue={q}
        searchPlaceholder="주문번호 · 이메일 · 닉네임 검색"
        filters={[
          {
            name: "status",
            label: "상태",
            value: status,
            options: [
              { value: "", label: "전체 상태" },
              { value: "paid", label: "완료" },
              { value: "pending", label: "대기" },
              { value: "failed", label: "실패" },
              { value: "refunded", label: "환불" },
            ],
          },
        ]}
      />

      <AdminTable
        columns={columns}
        rows={payments}
        rowKey={(p) => p.id}
        empty={{ title: "결제 내역이 없습니다" }}
      />

      <Pagination
        basePath="/admin/payments"
        searchParams={{ q, status }}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
      />
    </>
  );
}
