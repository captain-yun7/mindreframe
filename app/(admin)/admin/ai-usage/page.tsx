import { requireAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { todayKst } from "@/lib/dates";
import { PageHeader } from "../_ui/page-header";
import { StatCard } from "../_ui/stat-card";
import { StatusBadge } from "../_ui/status-badge";
import { AdminTable, type Column } from "../_ui/admin-table";
import { Pagination } from "../_ui/pagination";
import { EmptyState } from "../_ui/empty-state";
import { fmtDate } from "../_ui/lib/fmt";
import type { BadgeTone } from "../_ui/lib/labels";

const PAGE_SIZE = 50;
const BASE_PATH = "/admin/ai-usage";

interface UsageRow {
  id: string;
  user_id: string;
  used_at: string;
  feature: string;
  count: number;
}

interface UserLite {
  id: string;
  nickname: string | null;
  email: string | null;
}

const FEATURE_META: Record<string, { label: string; tone: BadgeTone }> = {
  analyzer: { label: "분석기", tone: "primary" },
  trash: { label: "쓰레기통", tone: "success" },
};

const FEATURE_OPTIONS = [
  { value: "", label: "전체 기능" },
  { value: "analyzer", label: "분석기" },
  { value: "trash", label: "쓰레기통" },
];

function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01";
}

function featureBadge(feature: string) {
  const meta = FEATURE_META[feature] ?? {
    label: feature,
    tone: "neutral" as BadgeTone,
  };
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

function daysAgoKst(days: number): string {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  return new Date(Date.now() + KST_OFFSET_MS - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export default async function AdminAiUsagePage({
  searchParams,
}: {
  searchParams: Promise<{
    feature?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const feature = params.feature ?? "";
  const today = todayKst();
  const from = params.from || daysAgoKst(29);
  const to = params.to || today;
  const page = Math.max(1, Number(params.page ?? "1"));

  await requireAdmin();

  // 페이지네이션 목록 (기간/기능 필터 반영)
  let listQuery = supabaseAdmin
    .from("ai_usage")
    .select("id, user_id, used_at, feature, count", { count: "exact" })
    .gte("used_at", from)
    .lte("used_at", to)
    .order("used_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (feature) listQuery = listQuery.eq("feature", feature);

  const listRes = (await listQuery) as {
    data: UsageRow[] | null;
    count: number | null;
    error: { code?: string; message: string } | null;
  };

  const tableMissing = isMissingTable(listRes.error);
  const rows = listRes.data ?? [];
  const totalCount = listRes.count ?? 0;

  // 집계: 기간 내 전체 rows (used_at/feature/count) — 일자합계 + 기능별 합산용
  let rangeRows: { used_at: string; feature: string; count: number }[] = [];
  let todayRows: { feature: string; count: number }[] = [];
  if (!tableMissing) {
    let rangeQuery = supabaseAdmin
      .from("ai_usage")
      .select("used_at, feature, count")
      .gte("used_at", from)
      .lte("used_at", to)
      .limit(10000);
    if (feature) rangeQuery = rangeQuery.eq("feature", feature);
    const { data: rangeData } = await rangeQuery;
    rangeRows = (rangeData ?? []) as typeof rangeRows;

    const { data: todayData } = await supabaseAdmin
      .from("ai_usage")
      .select("feature, count")
      .eq("used_at", today);
    todayRows = (todayData ?? []) as typeof todayRows;
  }

  const sum = (arr: { count: number }[]) =>
    arr.reduce((s, r) => s + (r.count ?? 0), 0);

  const rangeSum = sum(rangeRows);
  const todaySum = sum(todayRows);
  const analyzerSum = sum(rangeRows.filter((r) => r.feature === "analyzer"));
  const trashSum = sum(rangeRows.filter((r) => r.feature === "trash"));

  // 일자별 합계
  const byDate = new Map<string, number>();
  for (const r of rangeRows) {
    byDate.set(r.used_at, (byDate.get(r.used_at) ?? 0) + (r.count ?? 0));
  }
  const dailyRows = Array.from(byDate.entries())
    .map(([used_at, total]) => ({ used_at, total }))
    .sort((a, b) => (a.used_at < b.used_at ? 1 : -1));

  // 유저 매핑
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const userMap = new Map<string, UserLite>();
  if (userIds.length > 0) {
    const { data: usersData } = await supabaseAdmin
      .from("users")
      .select("id, nickname, email")
      .in("id", userIds);
    for (const u of (usersData ?? []) as UserLite[]) userMap.set(u.id, u);
  }

  const dailyColumns: Column<{ used_at: string; total: number }>[] = [
    {
      key: "used_at",
      header: "일자",
      cell: (r) => (
        <span className="text-[13px] whitespace-nowrap">
          {fmtDate(r.used_at)}
        </span>
      ),
    },
    {
      key: "total",
      header: "사용량 합계",
      align: "right",
      cell: (r) => (
        <span className="text-[13px] font-bold tabular-nums">
          {r.total.toLocaleString("ko-KR")}
        </span>
      ),
    },
  ];

  const listColumns: Column<UsageRow>[] = [
    {
      key: "used_at",
      header: "일자",
      cell: (r) => (
        <span className="text-[13px] whitespace-nowrap">
          {fmtDate(r.used_at)}
        </span>
      ),
    },
    {
      key: "user",
      header: "유저",
      cell: (r) => {
        const u = userMap.get(r.user_id);
        return (
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-gs-text-strong truncate">
              {u?.nickname ?? "사용자"}
            </div>
            <div className="text-[11px] text-gs-muted truncate">
              {u?.email ?? r.user_id.slice(0, 8)}
            </div>
          </div>
        );
      },
    },
    {
      key: "feature",
      header: "기능",
      cell: (r) => featureBadge(r.feature),
    },
    {
      key: "count",
      header: "사용량",
      align: "right",
      cell: (r) => (
        <span className="text-[13px] font-bold tabular-nums">
          {(r.count ?? 0).toLocaleString("ko-KR")}
        </span>
      ),
    },
  ];

  const inputCls =
    "px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gs-blue/40";

  return (
    <>
      <PageHeader title="AI 사용량" desc="기능별 AI 사용 현황 (읽기 전용)" />

      {tableMissing ? (
        <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card">
          <EmptyState
            title="AI 사용량 테이블이 아직 없습니다"
            desc="ai_usage 테이블이 생성되지 않았습니다. 마이그레이션 적용 후 표시됩니다."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4 max-sm:grid-cols-2">
            <StatCard label="오늘 사용량" value={todaySum.toLocaleString("ko-KR")} />
            <StatCard
              label={`기간 합계 (${fmtDate(from)}~)`}
              value={rangeSum.toLocaleString("ko-KR")}
            />
            <StatCard
              label="분석기"
              value={analyzerSum.toLocaleString("ko-KR")}
            />
            <StatCard label="쓰레기통" value={trashSum.toLocaleString("ko-KR")} />
          </div>

          <form
            method="GET"
            action={BASE_PATH}
            className="flex flex-wrap items-center gap-2 mb-4 bg-white rounded-[14px] border border-gs-line-soft p-3 shadow-gs-card"
          >
            <label className="text-xs text-gs-muted font-bold">기간</label>
            <input type="date" name="from" defaultValue={from} className={inputCls} />
            <span className="text-gs-muted">~</span>
            <input type="date" name="to" defaultValue={to} className={inputCls} />
            <select
              name="feature"
              defaultValue={feature}
              aria-label="기능"
              className={inputCls}
            >
              {FEATURE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-[10px] bg-gs-navy-900 text-white text-sm font-bold hover:bg-gs-navy-800 transition-colors"
            >
              적용
            </button>
          </form>

          <div className="mb-6">
            <div className="text-sm font-[950] tracking-[-0.03em] text-gs-navy-900 mb-2">
              일자별 사용량
            </div>
            <AdminTable
              columns={dailyColumns}
              rows={dailyRows}
              rowKey={(r) => r.used_at}
              empty={{ title: "해당 기간 사용량이 없습니다" }}
            />
          </div>

          <div className="text-sm font-[950] tracking-[-0.03em] text-gs-navy-900 mb-2">
            사용 목록
          </div>
          <AdminTable
            columns={listColumns}
            rows={rows}
            rowKey={(r) => r.id}
            empty={{ title: "사용 기록이 없습니다" }}
          />

          <Pagination
            basePath={BASE_PATH}
            searchParams={{
              feature: feature || undefined,
              from: params.from || undefined,
              to: params.to || undefined,
            }}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
          />
        </>
      )}
    </>
  );
}
