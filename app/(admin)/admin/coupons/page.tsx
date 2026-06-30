import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeSearchTerm } from "@/lib/utils";
import { PageHeader } from "../_ui/page-header";
import { AdminTable, type Column } from "../_ui/admin-table";
import { Pagination } from "../_ui/pagination";
import { SearchFilterBar } from "../_ui/search-filter-bar";
import { StatusBadge } from "../_ui/status-badge";
import { planLabel, PLAN_TONE } from "../_ui/lib/labels";
import { fmtDate } from "../_ui/lib/fmt";

interface CouponRow {
  code: string;
  description: string | null;
  plan: string;
  duration_days: number;
  valid_until: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

const PAGE_SIZE = 50;
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));
  const safeQ = sanitizeSearchTerm(q);

  let query = supabaseAdmin
    .from("coupons")
    .select(
      "code, description, plan, duration_days, valid_until, max_uses, used_count, is_active, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (safeQ) query = query.or(`code.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  const { data, error, count } = await query;
  const migMissing =
    error &&
    ((error as { code?: string }).code === "42P01" ||
      /relation .* coupons .* does not exist/.test(error.message));
  const coupons: CouponRow[] = migMissing ? [] : ((data as CouponRow[]) ?? []);
  const totalCount = migMissing ? 0 : count ?? 0;

  const columns: Column<CouponRow>[] = [
    {
      key: "code",
      header: "코드",
      cell: (c) => (
        <Link href={`/admin/coupons/${encodeURIComponent(c.code)}`} className="block">
          <span className="font-mono font-bold text-gs-blue hover:underline">{c.code}</span>
          {c.description && (
            <div className="text-[11px] text-gs-muted font-normal">{c.description}</div>
          )}
        </Link>
      ),
    },
    {
      key: "plan",
      header: "플랜",
      cell: (c) => (
        <StatusBadge tone={PLAN_TONE[c.plan] ?? "neutral"}>{planLabel(c.plan)}</StatusBadge>
      ),
    },
    { key: "days", header: "기간", align: "right", cell: (c) => <span>{c.duration_days}일</span> },
    {
      key: "uses",
      header: "사용/한도",
      align: "right",
      cell: (c) => (
        <span className="tabular-nums">
          {c.used_count}
          {c.max_uses !== null ? ` / ${c.max_uses}` : ""}
        </span>
      ),
    },
    {
      key: "until",
      header: "만료",
      hideOnMobile: true,
      cell: (c) => <span className="text-xs text-gs-muted">{c.valid_until ? fmtDate(c.valid_until) : "-"}</span>,
    },
    {
      key: "status",
      header: "상태",
      align: "center",
      cell: (c) =>
        c.is_active ? (
          <StatusBadge tone="success">활성</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">비활성</StatusBadge>
        ),
    },
    {
      key: "manage",
      header: "",
      align: "right",
      cell: (c) => (
        <Link
          href={`/admin/coupons/${encodeURIComponent(c.code)}`}
          className="text-xs font-bold text-gs-blue hover:underline"
        >
          편집 →
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="쿠폰 관리"
        desc="토스 PG 통과 전에도 쿠폰으로 무료 체험 사용자 운영 가능"
        actions={
          <Link
            href="/admin/coupons/new"
            className="px-3 py-2 rounded-[10px] bg-gs-navy-900 text-white text-sm font-bold hover:bg-gs-navy-800 transition-colors"
          >
            + 새 쿠폰
          </Link>
        }
      />

      {migMissing && (
        <div className="mb-4 p-3 rounded-[12px] bg-amber-50 border border-amber-200 text-xs text-amber-700">
          <code>20260529_plans_coupons.sql</code> 마이그레이션을 먼저 적용해주세요.
        </div>
      )}

      <SearchFilterBar
        action="/admin/coupons"
        searchValue={q}
        searchPlaceholder="코드 또는 설명 검색"
        filters={[
          {
            name: "status",
            label: "상태",
            value: status,
            options: [
              { value: "", label: "전체 상태" },
              { value: "active", label: "활성" },
              { value: "inactive", label: "비활성" },
            ],
          },
        ]}
      />

      <AdminTable
        columns={columns}
        rows={coupons}
        rowKey={(c) => c.code}
        empty={{ title: "쿠폰이 없습니다", desc: "+ 새 쿠폰으로 발행하세요." }}
      />

      <Pagination
        basePath="/admin/coupons"
        searchParams={{ q, status }}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
      />
    </>
  );
}
