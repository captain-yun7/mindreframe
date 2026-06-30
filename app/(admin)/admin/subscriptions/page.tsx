import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "../_ui/page-header";
import { StatCard } from "../_ui/stat-card";
import { SearchFilterBar } from "../_ui/search-filter-bar";
import { AdminTable, type Column } from "../_ui/admin-table";
import { Pagination } from "../_ui/pagination";
import { MappedBadge } from "../_ui/status-badge";
import { fmtDate } from "../_ui/lib/fmt";
import { SUBSCRIPTION_STATUS, PLAN_LABEL } from "../_ui/lib/labels";

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { value: "", label: "전체 상태" },
  { value: "active", label: "활성" },
  { value: "cancelled", label: "해지" },
  { value: "paused", label: "일시정지" },
  { value: "expired", label: "만료" },
];

interface SubscriptionRow {
  id: string;
  user_id: string;
  status: string;
  plan: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
}

interface UserLite {
  id: string;
  email: string | null;
  nickname: string | null;
}

function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01";
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));

  // q 검색: users에서 이메일/닉네임 ilike로 id 목록을 먼저 찾는다.
  let userIdFilter: string[] | null = null;
  if (q) {
    const { data: matched } = await supabaseAdmin
      .from("users")
      .select("id")
      .or(`email.ilike.%${q}%,nickname.ilike.%${q}%`)
      .limit(1000);
    userIdFilter = ((matched ?? []) as { id: string }[]).map((u) => u.id);
  }

  let rows: SubscriptionRow[] = [];
  let totalCount = 0;
  let activeCount = 0;
  let cancelledCount = 0;
  let allCount = 0;
  let tableMissing = false;

  if (userIdFilter && userIdFilter.length === 0) {
    // q 검색 결과 매칭 유저가 없음 → 빈 목록 (쿼리 생략)
  } else {
    let listQuery = supabaseAdmin
      .from("subscriptions")
      .select(
        "id, user_id, status, plan, current_period_start, current_period_end, cancelled_at, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (status) listQuery = listQuery.eq("status", status);
    if (userIdFilter) listQuery = listQuery.in("user_id", userIdFilter);

    const listRes = await listQuery;
    if (isMissingTable(listRes.error)) {
      tableMissing = true;
    } else {
      rows = (listRes.data ?? []) as unknown as SubscriptionRow[];
      totalCount = listRes.count ?? 0;

      const [activeRes, cancelledRes, allRes] = await Promise.all([
        supabaseAdmin
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabaseAdmin
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "cancelled"),
        supabaseAdmin
          .from("subscriptions")
          .select("id", { count: "exact", head: true }),
      ]);
      activeCount = activeRes.count ?? 0;
      cancelledCount = cancelledRes.count ?? 0;
      allCount = allRes.count ?? 0;
    }
  }

  // 가입자 정보 map (현재 페이지 행 대상)
  const userMap = new Map<string, UserLite>();
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, email, nickname")
      .in("id", userIds);
    for (const u of (users ?? []) as UserLite[]) userMap.set(u.id, u);
  }

  const columns: Column<SubscriptionRow>[] = [
    {
      key: "user",
      header: "가입자",
      cell: (row) => {
        const u = userMap.get(row.user_id);
        return (
          <Link
            href={`/admin/subscriptions/${row.id}`}
            className="text-gs-blue font-bold hover:underline"
          >
            {u?.nickname ?? "사용자"}
            <span className="block text-[11px] text-gs-muted font-normal">
              {u?.email ?? "-"}
            </span>
          </Link>
        );
      },
    },
    {
      key: "plan",
      header: "플랜",
      cell: (row) => (
        <MappedBadge
          value={row.plan}
          map={Object.fromEntries(
            Object.entries(PLAN_LABEL).map(([k, label]) => [
              k,
              { label, tone: "primary" as const },
            ]),
          )}
        />
      ),
    },
    {
      key: "status",
      header: "상태",
      cell: (row) => (
        <MappedBadge value={row.status} map={SUBSCRIPTION_STATUS} />
      ),
    },
    {
      key: "period",
      header: "현재 기간",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-xs text-gs-muted whitespace-nowrap">
          {fmtDate(row.current_period_start)} ~ {fmtDate(row.current_period_end)}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "생성일",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-xs text-gs-muted whitespace-nowrap">
          {fmtDate(row.created_at)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="구독 관리" desc="구독 상태 조회 · 해지 · 재개" />

      <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1 mb-5">
        <StatCard label="활성 구독" value={activeCount.toLocaleString()} tone="success" />
        <StatCard label="해지" value={cancelledCount.toLocaleString()} />
        <StatCard label="전체" value={allCount.toLocaleString()} />
      </div>

      <SearchFilterBar
        action="/admin/subscriptions"
        searchName="q"
        searchValue={q}
        searchPlaceholder="가입자 이메일·닉네임 검색"
        filters={[
          { name: "status", label: "상태", value: status, options: STATUS_OPTIONS },
        ]}
      />

      {tableMissing ? (
        <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card p-8 text-center text-sm text-gs-muted">
          subscriptions 테이블이 아직 적용되지 않았어요. 마이그레이션 적용 후 사용
          가능합니다.
        </div>
      ) : (
        <>
          <AdminTable<SubscriptionRow>
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            empty={{
              title: "구독이 없습니다",
              desc: q || status ? "검색·필터 조건을 변경해 보세요." : undefined,
            }}
          />
          <Pagination
            basePath="/admin/subscriptions"
            searchParams={params}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
          />
        </>
      )}
    </>
  );
}
