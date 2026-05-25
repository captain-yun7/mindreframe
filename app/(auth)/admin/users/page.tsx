import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { Card } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeSearchTerm } from "@/lib/utils";
import {
  daysSinceWeekStartKst,
  getCoachWarningLevel,
  mondayStartIsoKst,
} from "@/lib/admin/coach-warning";

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

function calcProgress(startedAt: string | null): {
  dayN: number | null;
  remaining: number | null;
} {
  if (!startedAt) return { dayN: null, remaining: null };
  // KST 00:00 기준 1일차부터 카운트
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
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1"));
  const safeQ = sanitizeSearchTerm(q);

  await requireAdmin();

  let users: UserRow[] = [];
  let totalCount = 0;
  let rpcAvailable = true;

  // 1) RPC 시도 (Sprint A의 RPC 패턴 답습)
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
    "get_admin_user_list",
    {
      p_query: safeQ || null,
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    },
  );

  if (!rpcError && rpcData) {
    users = (rpcData as UserRow[]).map((r) => ({ ...r }));
    totalCount = Number(
      ((rpcData as { total_count?: number | string }[])[0]?.total_count) ?? 0,
    );
  } else {
    rpcAvailable = false;
    if (rpcError) console.warn("[admin/users] RPC fallback:", rpcError.message);
    // 2) fallback — 단일 쿼리, 신규 컬럼은 null. deleted_at IS NULL 시도, 컬럼 없으면 재쿼리
    const baseCols =
      "id, email, nickname, plan, plan_expires_at, role, phone_number, notifications_started_at, created_at";
    const buildQuery = (withDeletedFilter: boolean) => {
      let q1 = supabaseAdmin
        .from("users")
        .select(baseCols, { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (withDeletedFilter) q1 = q1.is("deleted_at", null);
      if (safeQ) q1 = q1.or(`email.ilike.%${safeQ}%,nickname.ilike.%${safeQ}%`);
      return q1;
    };

    const first = await buildQuery(true);
    let data = first.data;
    let count = first.count;
    const firstErr = first.error;
    // deleted_at 컬럼 미적용 환경 fallback
    if (
      firstErr &&
      (firstErr.code === "42703" || /deleted_at/.test(firstErr.message))
    ) {
      const r2 = await buildQuery(false);
      data = r2.data;
      count = r2.count;
    }

    const monday = new Date(mondayStartIsoKst());
    const daysIntoWeek = daysSinceWeekStartKst();
    const ids = (data ?? []).map((u) => u.id);

    // fallback 환경에서 빨간 경고는 별도 쿼리로 (RPC가 없을 때만)
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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <PageLayout>
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin" className="text-sm text-gs-blue">
          ← 대시보드
        </Link>
      </div>
      <div className="flex justify-between items-center mb-2">
        <PageTitle>사용자 관리</PageTitle>
        <Link
          href="/admin/users/new"
          className="px-3 py-2 rounded-[10px] bg-gs-blue text-white text-sm font-bold"
        >
          + 새 사용자
        </Link>
      </div>
      <div className="text-xs text-gs-muted mb-4">
        총 {totalCount}명{rpcAvailable ? "" : " · RPC 미적용 fallback"}
      </div>

      <Card className="p-4 mb-4">
        <form method="GET" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="이메일 또는 닉네임 검색"
            className="flex-1 px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm focus:outline-none focus:ring-2 focus:ring-gs-blue/40"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-[10px] bg-gs-blue text-white text-sm font-bold"
          >
            검색
          </button>
        </form>
      </Card>

      <div className="bg-white rounded-[14px] border border-gs-line-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gs-surface-muted border-b border-gs-line-soft">
            <tr className="text-left text-xs text-gs-muted">
              <th className="px-3 py-2">가입일</th>
              <th className="px-3 py-2">닉네임</th>
              <th className="px-3 py-2">이메일</th>
              <th className="px-3 py-2">플랜</th>
              <th className="px-3 py-2">결제</th>
              <th className="px-3 py-2">종료일</th>
              <th className="px-3 py-2">진행</th>
              <th className="px-3 py-2">남은</th>
              <th className="px-3 py-2">권한</th>
              <th className="px-3 py-2">휴대폰</th>
              <th className="px-3 py-2">알림</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-gs-muted">
                  검색 결과 없음
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const progress = calcProgress(u.notifications_started_at);
                const warning = u.coach_warning === "red";
                return (
                  <tr
                    key={u.id}
                    className={
                      "border-b border-gs-line-soft hover:bg-gs-surface-muted/50 " +
                      (warning ? "border-l-4 border-l-gs-danger" : "")
                    }
                  >
                    <td className="px-3 py-2 text-xs text-gs-muted">
                      {new Date(u.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {warning && (
                          <span
                            title="이번 주 코칭 0회"
                            aria-label="플랜 미달"
                            className="text-gs-danger"
                          >
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
                    </td>
                    <td className="px-3 py-2 text-xs">{u.email}</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gs-blue-light text-gs-blue font-bold uppercase">
                        {u.plan ?? "free"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {u.payment_status ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {u.plan_expires_at
                        ? new Date(u.plan_expires_at).toLocaleDateString("ko-KR")
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {progress.dayN ? `${progress.dayN}일차` : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {progress.remaining !== null ? `${progress.remaining}일` : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">{u.role}</td>
                    <td className="px-3 py-2 text-xs">{u.phone_number ?? "-"}</td>
                    <td className="px-3 py-2 text-xs">
                      {u.notifications_started_at ? "✅" : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex gap-2 justify-center">
          {page > 1 && (
            <Link
              href={`/admin/users?q=${encodeURIComponent(q)}&page=${page - 1}`}
              className="px-3 py-1.5 rounded-[8px] border border-gs-line-soft text-sm hover:bg-gs-surface-muted"
            >
              이전
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/users?q=${encodeURIComponent(q)}&page=${page + 1}`}
              className="px-3 py-1.5 rounded-[8px] border border-gs-line-soft text-sm hover:bg-gs-surface-muted"
            >
              다음
            </Link>
          )}
        </div>
      )}
    </PageLayout>
  );
}
