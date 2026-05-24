import Link from "next/link";
import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { Card, CardTitle } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import { todayKst } from "@/lib/dates";

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const today = todayKst();

  const [
    totalUsersRes,
    paidUsersRes,
    todaySignupsRes,
    todayAnalysesRes,
    activeCoachSessionsRes,
    todayNotificationsRes,
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .neq("plan", "free"),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00+09:00`),
    supabase
      .from("chat_analyses")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00+09:00`),
    supabase
      .from("coach_chat_sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("notification_logs")
      .select("id, status")
      .gte("created_at", `${today}T00:00:00+09:00`),
  ]);

  const todayNotifications = todayNotificationsRes.data ?? [];
  const todaySent = todayNotifications.filter((n) => n.status === "sent").length;
  const todayFailed = todayNotifications.filter((n) => n.status === "failed").length;

  const kpis = [
    { label: "전체 가입자", value: totalUsersRes.count ?? 0 },
    { label: "유료 사용자", value: paidUsersRes.count ?? 0 },
    { label: "오늘 가입", value: todaySignupsRes.count ?? 0 },
    { label: "오늘 분석", value: todayAnalysesRes.count ?? 0 },
    { label: "활성 코치 세션", value: activeCoachSessionsRes.count ?? 0 },
    { label: "오늘 알림 발송", value: `${todaySent}/${todaySent + todayFailed}` },
  ];

  return (
    <PageLayout>
      <PageTitle>관리자 대시보드</PageTitle>
      <PageLead>운영 현황 한눈에 보기.</PageLead>

      <div className="mt-6 grid grid-cols-3 gap-3 max-sm:grid-cols-2">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-[14px] p-4 border border-gs-line-soft shadow-gs-card"
          >
            <div className="text-xs text-gs-muted font-[750]">{k.label}</div>
            <div className="text-2xl font-[950] mt-1">{k.value}</div>
          </div>
        ))}
      </div>

      <Card className="mt-6">
        <CardTitle>관리 메뉴</CardTitle>
        <div className="mt-4 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          {[
            { href: "/admin/users", label: "사용자 관리", desc: "검색·플랜·알림 상태 + 직접 수정" },
            { href: "/admin/payments", label: "결제 이력", desc: "전체 결제 + 상태 필터" },
            { href: "/admin/notifications", label: "알림 발송 이력", desc: "성공·실패·재시도" },
            { href: "/admin/stats", label: "통계", desc: "가입·분석·플랜·인지왜곡 분포" },
            { href: "/admin/coach", label: "코치 채팅", desc: "활성 세션 답변" },
            { href: "/admin/prompts", label: "분석기 프롬프트", desc: "분석기 지시문 뷰어" },
          ].map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="p-4 rounded-[14px] bg-gs-surface-muted border border-gs-line-soft hover:shadow-gs-card-hover transition-shadow"
            >
              <div className="text-sm font-bold">{m.label}</div>
              <div className="text-xs text-gs-muted mt-1">{m.desc}</div>
            </Link>
          ))}
        </div>
      </Card>
    </PageLayout>
  );
}
