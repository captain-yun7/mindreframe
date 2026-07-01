import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeSearchTerm } from "@/lib/utils";
import {
  daysSinceWeekStartKst,
  getCoachWarningLevel,
  mondayStartIsoKst,
} from "@/lib/admin/coach-warning";
import { PageHeader } from "../_ui/page-header";
import { AdminTable, type Column } from "../_ui/admin-table";
import { Pagination } from "../_ui/pagination";
import { SearchFilterBar } from "../_ui/search-filter-bar";
import { StatusBadge } from "../_ui/status-badge";
import { planLabel, roleLabel, PLAN_TONE } from "../_ui/lib/labels";
import { fmtDate, fmtPhone } from "../_ui/lib/fmt";
import { UsersExportButton } from "./users-export-button";
import { UserRowActions } from "./user-row-actions";

const PAGE_SIZE = 50;

interface UserRow {
  id: string;
  email: string;
  nickname: string;
  plan: string | null;
  plan_expires_at: string | null;
  role: string;
  phone_number: string | null;
  notifications_started_at: string | null;
  created_at: string;
  payment_status: string | null;
  coach_sessions_this_week: number | null;
  coach_warning: "red" | null;
}

function calcProgress(startedAt: string | null): { dayN: number | null; remaining: number | null } {
  if (!startedAt) return { dayN: null, remaining: null };
  const start = new Date(startedAt + "T00:00:00+09:00");
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1;
  const dayN = Math.max(1, Math.min(100, elapsed));
  const remaining = Math.max(0, 100 - elapsed + 1);
  return { dayN, remaining };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    plan?: string;
    role?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const plan = params.plan ?? "";
  const role = params.role ?? "";
  const sort = params.sort ?? "created_desc";
  const page = Math.max(1, Number(params.page ?? "1"));
  const safeQ = sanitizeSearchTerm(q);

  await requireAdmin();

  let users: UserRow[] = [];
  let totalCount = 0;
  let rpcAvailable = true;

  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("get_admin_user_list", {
    p_query: safeQ || null,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
    p_plan: plan || null,
    p_role: role || null,
    p_sort: sort,
  });

  if (!rpcError && rpcData) {
    users = (rpcData as UserRow[]).map((r) => ({ ...r }));
    totalCount = Number(
      (rpcData as { total_count?: number | string }[])[0]?.total_count ?? 0,
    );
  } else {
    rpcAvailable = false;
    if (rpcError) console.warn("[admin/users] RPC fallback:", rpcError.message);
    const baseCols =
      "id, email, nickname, plan, plan_expires_at, role, phone_number, notifications_started_at, created_at";
    const buildQuery = (withDeletedFilter: boolean) => {
      let q1 = supabaseAdmin
        .from("users")
        .select(baseCols, { count: "exact" })
        .order("created_at", { ascending: sort === "created_asc" })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (withDeletedFilter) q1 = q1.is("deleted_at", null);
      if (safeQ) q1 = q1.or(`email.ilike.%${safeQ}%,nickname.ilike.%${safeQ}%`);
      if (plan) q1 = q1.eq("plan", plan);
      if (role) q1 = q1.eq("role", role);
      return q1;
    };

    const first = await buildQuery(true);
    let data = first.data;
    let count = first.count;
    const firstErr = first.error;
    if (firstErr && (firstErr.code === "42703" || /deleted_at/.test(firstErr.message))) {
      const r2 = await buildQuery(false);
      data = r2.data;
      count = r2.count;
    }

    const monday = new Date(mondayStartIsoKst());
    const daysIntoWeek = daysSinceWeekStartKst();
    const ids = (data ?? []).map((u) => u.id);
    const weeklyMap = new Map<string, number>();
    if (ids.length > 0) {
      const { data: weekly } = await supabaseAdmin
        .from("coach_chat_sessions")
        .select("user_id")
        .in("user_id", ids)
        .gte("started_at", monday.toISOString());
      for (const w of (weekly ?? []) as { user_id: string }[]) {
        weeklyMap.set(w.user_id, (weeklyMap.get(w.user_id) ?? 0) + 1);
      }
    }

    users = ((data ?? []) as Omit<UserRow, "payment_status" | "coach_sessions_this_week" | "coach_warning">[]).map(
      (u) => {
        const sessionsThisWeek = weeklyMap.get(u.id) ?? 0;
        return {
          ...u,
          payment_status: null,
          coach_sessions_this_week: sessionsThisWeek,
          coach_warning: getCoachWarningLevel(u.plan, daysIntoWeek, sessionsThisWeek),
        };
      },
    );
    totalCount = count ?? 0;
  }

  const columns: Column<UserRow>[] = [
    {
      key: "created",
      header: "가입일",
      hideOnMobile: true,
      cell: (u) => <span className="text-xs text-gs-muted">{fmtDate(u.created_at)}</span>,
    },
    {
      key: "nickname",
      header: "닉네임",
      cell: (u) => (
        <div className="flex items-center gap-1">
          {u.coach_warning === "red" && (
            <span title="이번 주 코칭 0회" className="text-gs-danger">
              ⚠️
            </span>
          )}
          <Link
            href={`/admin/users/${u.id}`}
            className="text-gs-blue font-bold hover:underline"
          >
            {u.nickname}
          </Link>
        </div>
      ),
    },
    { key: "email", header: "이메일", cell: (u) => <span className="text-xs">{u.email}</span> },
    {
      key: "plan",
      header: "플랜",
      cell: (u) => (
        <StatusBadge tone={PLAN_TONE[u.plan ?? "free"] ?? "neutral"}>
          {planLabel(u.plan)}
        </StatusBadge>
      ),
    },
    { key: "pay", header: "결제", hideOnMobile: true, cell: (u) => <span className="text-xs">{u.payment_status ?? "-"}</span> },
    {
      key: "expires",
      header: "종료일",
      hideOnMobile: true,
      cell: (u) => <span className="text-xs">{u.plan_expires_at ? fmtDate(u.plan_expires_at) : "-"}</span>,
    },
    {
      key: "progress",
      header: "진행",
      hideOnMobile: true,
      cell: (u) => {
        const p = calcProgress(u.notifications_started_at);
        return <span className="text-xs">{p.dayN ? `${p.dayN}일차` : "-"}</span>;
      },
    },
    { key: "role", header: "권한", hideOnMobile: true, cell: (u) => <span className="text-xs">{roleLabel(u.role)}</span> },
    { key: "phone", header: "휴대폰", hideOnMobile: true, cell: (u) => <span className="text-xs">{fmtPhone(u.phone_number)}</span> },
    {
      key: "notify",
      header: "알림",
      align: "center",
      cell: (u) => <span className="text-xs">{u.notifications_started_at ? "✅" : "-"}</span>,
    },
    {
      key: "actions",
      header: "관리",
      align: "right",
      cell: (u) => (
        <UserRowActions userId={u.id} nickname={u.nickname} role={u.role} />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="사용자 관리"
        desc={`총 ${totalCount.toLocaleString()}명${rpcAvailable ? "" : " · RPC 미적용 fallback"}`}
        actions={
          <>
            <UsersExportButton rows={users} />
            <Link
              href="/admin/users/new"
              className="px-3 py-2 rounded-[10px] bg-gs-navy-900 text-white text-sm font-bold hover:bg-gs-navy-800 transition-colors"
            >
              + 새 사용자
            </Link>
          </>
        }
      />

      <SearchFilterBar
        action="/admin/users"
        searchValue={q}
        searchPlaceholder="이메일 또는 닉네임 검색"
        filters={[
          {
            name: "plan",
            label: "플랜",
            value: plan,
            options: [
              { value: "", label: "전체 플랜" },
              { value: "free", label: "무료" },
              { value: "light", label: "라이트" },
              { value: "pro", label: "프로" },
              { value: "premium", label: "프리미엄" },
            ],
          },
          {
            name: "role",
            label: "권한",
            value: role,
            options: [
              { value: "", label: "전체 권한" },
              { value: "user", label: "사용자" },
              { value: "coach", label: "코치" },
              { value: "admin", label: "관리자" },
            ],
          },
          {
            name: "sort",
            label: "정렬",
            value: sort,
            options: [
              { value: "created_desc", label: "최신 가입순" },
              { value: "created_asc", label: "오래된 가입순" },
              { value: "expires_asc", label: "종료 임박순" },
              { value: "expires_desc", label: "종료 늦은순" },
            ],
          },
        ]}
      />

      <AdminTable
        columns={columns}
        rows={users}
        rowKey={(u) => u.id}
        empty={{ title: "검색 결과가 없습니다", desc: "검색어나 필터를 바꿔보세요." }}
        rowClassName={(u) => (u.coach_warning === "red" ? "border-l-4 border-l-gs-danger" : undefined)}
      />

      <Pagination
        basePath="/admin/users"
        searchParams={{ q, plan, role, sort }}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
      />
    </>
  );
}
