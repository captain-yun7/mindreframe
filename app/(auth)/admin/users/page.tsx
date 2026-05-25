import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { Card } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import { sanitizeSearchTerm } from "@/lib/utils";

const PAGE_SIZE = 50;

interface UserRow {
  id: string;
  email: string;
  nickname: string;
  plan: string | null;
  role: string;
  phone_number: string | null;
  notifications_started_at: string | null;
  created_at: string;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1"));

  const { supabase } = await requireAdmin();

  let query = supabase
    .from("users")
    .select(
      "id, email, nickname, plan, role, phone_number, notifications_started_at, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const safeQ = sanitizeSearchTerm(q);
  if (safeQ) {
    query = query.or(`email.ilike.%${safeQ}%,nickname.ilike.%${safeQ}%`);
  }

  const { data, count } = await query;
  const users = (data ?? []) as UserRow[];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <PageLayout>
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin" className="text-sm text-gs-blue">
          ← 대시보드
        </Link>
      </div>
      <PageTitle>사용자 관리</PageTitle>
      <div className="text-xs text-gs-muted mb-4">총 {count ?? 0}명</div>

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
              <th className="px-3 py-2">닉네임</th>
              <th className="px-3 py-2">이메일</th>
              <th className="px-3 py-2">플랜</th>
              <th className="px-3 py-2">권한</th>
              <th className="px-3 py-2">휴대폰</th>
              <th className="px-3 py-2">알림</th>
              <th className="px-3 py-2">가입일</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gs-muted">
                  검색 결과 없음
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gs-line-soft hover:bg-gs-surface-muted/50"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-gs-blue font-bold hover:underline"
                    >
                      {u.nickname}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">{u.email}</td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gs-blue-light text-gs-blue font-bold uppercase">
                      {u.plan ?? "free"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{u.role}</td>
                  <td className="px-3 py-2 text-xs">{u.phone_number ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">
                    {u.notifications_started_at ? "✅" : "-"}
                  </td>
                  <td className="px-3 py-2 text-xs text-gs-muted">
                    {new Date(u.created_at).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))
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
