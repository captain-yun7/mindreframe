import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { Card } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";

const PAGE_SIZE = 50;

interface NotifRow {
  id: string;
  user_id: string;
  day_number: number;
  channel: string;
  status: string;
  external_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  users?: { nickname: string; email: string; phone_number: string | null } | null;
}

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));

  const { supabase } = await requireAdmin();

  let query = supabase
    .from("notification_logs")
    .select(
      "id, user_id, day_number, channel, status, external_message_id, error_message, sent_at, created_at, users:user_id (nickname, email, phone_number)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);

  const { data, count } = await query;
  const logs = (data ?? []) as unknown as NotifRow[];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // 오늘 통계
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: todayLogs } = await supabase
    .from("notification_logs")
    .select("status")
    .gte("created_at", `${today}T00:00:00+09:00`);
  const todaySent = (todayLogs ?? []).filter((l) => l.status === "sent").length;
  const todayFailed = (todayLogs ?? []).filter((l) => l.status === "failed").length;

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <Link href="/admin" className="text-sm text-gs-blue">
          ← 대시보드
        </Link>
        <Link
          href="/admin/notifications/messages"
          className="px-3 py-1.5 rounded-[10px] bg-gs-blue text-white text-sm font-bold"
        >
          100일 메시지 콘텐츠 편집 →
        </Link>
      </div>
      <PageTitle>알림 발송 이력</PageTitle>
      <div className="text-xs text-gs-muted mb-4">
        총 {count ?? 0}건 · 오늘 발송 성공 {todaySent} / 실패 {todayFailed}
      </div>

      <Card className="p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { v: "", label: "전체" },
            { v: "sent", label: "발송 완료" },
            { v: "pending", label: "대기" },
            { v: "failed", label: "실패" },
          ].map((f) => (
            <Link
              key={f.v}
              href={`/admin/notifications${f.v ? `?status=${f.v}` : ""}`}
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
              <th className="px-3 py-2">휴대폰</th>
              <th className="px-3 py-2">일차</th>
              <th className="px-3 py-2">채널</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">시각</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gs-muted">
                  발송 이력 없음
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-gs-line-soft hover:bg-gs-surface-muted/50"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/users/${l.user_id}`}
                      className="text-gs-blue hover:underline"
                    >
                      {l.users?.nickname ?? "사용자"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">{l.users?.phone_number ?? "-"}</td>
                  <td className="px-3 py-2 text-xs font-bold">{l.day_number}일차</td>
                  <td className="px-3 py-2 text-[10px] uppercase">{l.channel}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={l.status} />
                    {l.error_message && (
                      <div className="text-[10px] text-gs-danger mt-0.5 max-w-[200px] truncate">
                        {l.error_message}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gs-muted">
                    {new Date(l.sent_at ?? l.created_at).toLocaleString("ko-KR")}
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent: "bg-gs-success-bg text-gs-success",
    pending: "bg-gs-warning-bg text-gs-warning",
    failed: "bg-gs-danger-bg text-gs-danger",
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
    `/admin/notifications?${status ? `status=${status}&` : ""}page=${p}`;
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
