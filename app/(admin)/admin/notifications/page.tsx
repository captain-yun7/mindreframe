import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "../_ui/page-header";
import { AdminTable, type Column } from "../_ui/admin-table";
import { Pagination } from "../_ui/pagination";
import { SearchFilterBar } from "../_ui/search-filter-bar";
import { MappedBadge } from "../_ui/status-badge";
import { StatCard } from "../_ui/stat-card";
import { NOTIFICATION_STATUS } from "../_ui/lib/labels";
import { fmtDateTime, fmtPhone } from "../_ui/lib/fmt";
import { TestSendForm } from "./test-send-form";
import { ResendButton } from "./resend-button";

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

  await requireAdmin();

  let query = supabaseAdmin
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
  const totalCount = count ?? 0;

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: todayLogs } = await supabaseAdmin
    .from("notification_logs")
    .select("status")
    .gte("created_at", `${today}T00:00:00+09:00`);
  const todaySent = (todayLogs ?? []).filter((l) => l.status === "sent").length;
  const todayFailed = (todayLogs ?? []).filter((l) => l.status === "failed").length;

  const columns: Column<NotifRow>[] = [
    {
      key: "user",
      header: "사용자",
      cell: (l) => (
        <Link href={`/admin/users/${l.user_id}`} className="text-gs-blue font-bold hover:underline">
          {l.users?.nickname ?? "사용자"}
        </Link>
      ),
    },
    { key: "phone", header: "휴대폰", hideOnMobile: true, cell: (l) => <span className="text-xs">{fmtPhone(l.users?.phone_number)}</span> },
    { key: "day", header: "일차", align: "center", cell: (l) => <span className="text-xs font-bold">{l.day_number}일차</span> },
    { key: "channel", header: "채널", hideOnMobile: true, cell: (l) => <span className="text-[10px] uppercase text-gs-muted">{l.channel}</span> },
    {
      key: "status",
      header: "상태",
      cell: (l) => (
        <div>
          <MappedBadge value={l.status} map={NOTIFICATION_STATUS} />
          {l.error_message && (
            <div className="text-[10px] text-gs-danger mt-0.5 max-w-[220px] truncate" title={l.error_message}>
              {l.error_message}
            </div>
          )}
        </div>
      ),
    },
    { key: "time", header: "시각", hideOnMobile: true, cell: (l) => <span className="text-xs text-gs-muted">{fmtDateTime(l.sent_at ?? l.created_at)}</span> },
    {
      key: "manage",
      header: "",
      align: "right",
      cell: (l) =>
        l.status !== "sent" ? <ResendButton logId={l.id} dayNumber={l.day_number} /> : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="알림 발송 이력"
        desc={`총 ${totalCount.toLocaleString()}건`}
        actions={
          <Link
            href="/admin/notifications/messages"
            className="px-3 py-2 rounded-[10px] bg-gs-navy-900 text-white text-sm font-bold hover:bg-gs-navy-800 transition-colors"
          >
            100일 메시지 편집 →
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-5 max-sm:grid-cols-1">
        <StatCard label="오늘 발송 성공" value={todaySent} tone="success" />
        <StatCard label="오늘 발송 실패" value={todayFailed} tone={todayFailed > 0 ? "danger" : "default"} />
        <StatCard label="전체 발송" value={totalCount.toLocaleString()} />
      </div>

      <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card p-4 mb-5">
        <div className="text-sm font-[950] tracking-[-0.03em] text-gs-navy-900">
          알림톡/SMS 즉시 테스트 발송
        </div>
        <p className="text-xs text-gs-muted mt-1 mb-3">
          ENV(SOLAPI_*)와 검수 통과 템플릿 동작 확인용. 실제 메시지가 발송됩니다.
        </p>
        <TestSendForm />
      </div>

      <SearchFilterBar
        action="/admin/notifications"
        hideSearch
        filters={[
          {
            name: "status",
            label: "상태",
            value: status,
            options: [
              { value: "", label: "전체 상태" },
              { value: "sent", label: "발송 완료" },
              { value: "pending", label: "대기" },
              { value: "failed", label: "실패" },
            ],
          },
        ]}
      />

      <AdminTable
        columns={columns}
        rows={logs}
        rowKey={(l) => l.id}
        empty={{ title: "발송 이력이 없습니다" }}
      />

      <Pagination
        basePath="/admin/notifications"
        searchParams={{ status }}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
      />
    </>
  );
}
