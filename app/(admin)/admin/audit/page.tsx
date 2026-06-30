import { requireAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { todayKst } from "@/lib/dates";
import { PageHeader } from "../_ui/page-header";
import { StatCard } from "../_ui/stat-card";
import { StatusBadge } from "../_ui/status-badge";
import { SearchFilterBar } from "../_ui/search-filter-bar";
import { AdminTable, type Column } from "../_ui/admin-table";
import { Pagination } from "../_ui/pagination";
import { EmptyState } from "../_ui/empty-state";
import { fmtDateTime, fmtRelative } from "../_ui/lib/fmt";
import { auditActionLabel, AUDIT_ACTION_LABEL } from "../_ui/lib/labels";

const PAGE_SIZE = 50;
const BASE_PATH = "/admin/audit";

interface AuditRow {
  id: string;
  admin_user_id: string;
  action: string;
  target_user_id: string | null;
  payload: unknown;
  created_at: string;
}

interface UserLite {
  id: string;
  nickname: string | null;
  email: string | null;
}

function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01";
}

function payloadPreview(payload: unknown): string {
  if (payload === null || payload === undefined) return "";
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const params = await searchParams;
  const action = params.action ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));

  await requireAdmin();

  let query = supabaseAdmin
    .from("admin_audit_logs")
    .select("id, admin_user_id, action, target_user_id, payload, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (action) query = query.eq("action", action);

  const res = (await query) as {
    data: AuditRow[] | null;
    count: number | null;
    error: { code?: string; message: string } | null;
  };

  const tableMissing = isMissingTable(res.error);
  const rows = res.data ?? [];
  const totalCount = res.count ?? 0;

  // 상단 통계 (오늘/전체) — 필터와 무관한 절대치
  const today = todayKst();
  const [todayCountRes, allCountRes] = tableMissing
    ? [null, null]
    : await Promise.all([
        supabaseAdmin
          .from("admin_audit_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", `${today}T00:00:00+09:00`),
        supabaseAdmin
          .from("admin_audit_logs")
          .select("id", { count: "exact", head: true }),
      ]);

  // 닉네임 매핑 — admin/target 양쪽 id 모아 한 번에 조회
  const userIds = Array.from(
    new Set(
      rows.flatMap((r) =>
        [r.admin_user_id, r.target_user_id].filter(
          (v): v is string => Boolean(v),
        ),
      ),
    ),
  );
  const userMap = new Map<string, UserLite>();
  if (userIds.length > 0) {
    const { data: usersData } = await supabaseAdmin
      .from("users")
      .select("id, nickname, email")
      .in("id", userIds);
    for (const u of (usersData ?? []) as UserLite[]) userMap.set(u.id, u);
  }

  const renderUser = (id: string | null) => {
    if (!id) return <span className="text-gs-muted">-</span>;
    const u = userMap.get(id);
    return (
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-gs-text-strong truncate">
          {u?.nickname ?? "사용자"}
        </div>
        <div className="text-[11px] text-gs-muted truncate">
          {u?.email ?? id.slice(0, 8)}
        </div>
      </div>
    );
  };

  const columns: Column<AuditRow>[] = [
    {
      key: "created_at",
      header: "시각",
      cell: (r) => (
        <div>
          <div className="text-[13px] text-gs-text-strong whitespace-nowrap">
            {fmtDateTime(r.created_at)}
          </div>
          <div className="text-[11px] text-gs-muted">
            {fmtRelative(r.created_at)}
          </div>
        </div>
      ),
    },
    {
      key: "admin",
      header: "관리자",
      cell: (r) => renderUser(r.admin_user_id),
    },
    {
      key: "action",
      header: "액션",
      cell: (r) => (
        <StatusBadge tone="primary">{auditActionLabel(r.action)}</StatusBadge>
      ),
    },
    {
      key: "target",
      header: "대상",
      cell: (r) => renderUser(r.target_user_id),
      hideOnMobile: true,
    },
    {
      key: "payload",
      header: "상세",
      cell: (r) => {
        const preview = payloadPreview(r.payload);
        if (!preview) return <span className="text-gs-muted">-</span>;
        return (
          <details className="max-w-[320px]">
            <summary className="cursor-pointer text-[12px] text-gs-blue font-bold list-none">
              <span className="font-mono text-gs-muted truncate inline-block max-w-[280px] align-bottom">
                {preview.length > 60 ? `${preview.slice(0, 60)}…` : preview}
              </span>
            </summary>
            <pre className="mt-1.5 p-2 rounded-[8px] bg-gs-surface-muted border border-gs-line-soft text-[11px] text-gs-text-strong whitespace-pre-wrap break-all overflow-x-auto">
              {JSON.stringify(r.payload, null, 2)}
            </pre>
          </details>
        );
      },
      hideOnMobile: true,
    },
  ];

  // action 필터 옵션 — 라벨맵 키 기반
  const actionOptions = [
    { value: "", label: "전체 액션" },
    ...Object.keys(AUDIT_ACTION_LABEL).map((k) => ({
      value: k,
      label: AUDIT_ACTION_LABEL[k],
    })),
  ];

  return (
    <>
      <PageHeader title="감사 로그" desc="관리자 작업 이력 (읽기 전용)" />

      {tableMissing ? (
        <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card">
          <EmptyState
            title="감사 로그 테이블이 아직 없습니다"
            desc="admin_audit_logs 테이블이 생성되지 않았습니다. 마이그레이션 적용 후 표시됩니다."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="오늘 작업" value={todayCountRes?.count ?? 0} />
            <StatCard
              label="전체 작업"
              value={(allCountRes?.count ?? 0).toLocaleString("ko-KR")}
            />
          </div>

          <SearchFilterBar
            action={BASE_PATH}
            searchName="__noop"
            searchPlaceholder="액션 선택으로 필터링"
            filters={[
              {
                name: "action",
                label: "액션",
                value: action,
                options: actionOptions,
              },
            ]}
          />

          <AdminTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            empty={{
              title: "감사 로그가 없습니다",
              desc: action ? "선택한 액션의 기록이 없습니다." : undefined,
            }}
          />

          <Pagination
            basePath={BASE_PATH}
            searchParams={{ action: action || undefined }}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
          />
        </>
      )}
    </>
  );
}
