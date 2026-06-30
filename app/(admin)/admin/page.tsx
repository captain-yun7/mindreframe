import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { todayKst } from "@/lib/dates";
import { PageHeader } from "./_ui/page-header";
import { StatCard } from "./_ui/stat-card";

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
    supabaseAdmin
      .from("notification_logs")
      .select("id, status")
      .gte("created_at", `${today}T00:00:00+09:00`),
  ]);

  const todayNotifications = todayNotificationsRes.data ?? [];
  const todaySent = todayNotifications.filter((n) => n.status === "sent").length;
  const todayFailed = todayNotifications.filter((n) => n.status === "failed").length;

  const kpis: {
    label: string;
    value: React.ReactNode;
    tone?: "default" | "danger" | "success";
    hint?: string;
  }[] = [
    { label: "전체 가입자", value: (totalUsersRes.count ?? 0).toLocaleString() },
    { label: "유료 사용자", value: (paidUsersRes.count ?? 0).toLocaleString() },
    { label: "오늘 가입", value: todaySignupsRes.count ?? 0 },
    { label: "오늘 분석", value: todayAnalysesRes.count ?? 0 },
    { label: "활성 코치 세션", value: activeCoachSessionsRes.count ?? 0 },
    {
      label: "오늘 알림",
      value: `${todaySent}/${todaySent + todayFailed}`,
      tone: todayFailed > 0 ? "danger" : "default",
      hint: todayFailed > 0 ? `실패 ${todayFailed}건` : "정상",
    },
  ];

  const quickLinks = [
    { href: "/admin/users", label: "사용자 관리", desc: "검색·필터·플랜·일괄·CSV" },
    { href: "/admin/payments", label: "결제 이력", desc: "상세·검색·환불" },
    { href: "/admin/subscriptions", label: "구독 관리", desc: "상태·해지·재개" },
    { href: "/admin/coupons", label: "쿠폰 관리", desc: "발행·편집·사용이력" },
    { href: "/admin/coach", label: "코치 채팅", desc: "활성 세션 답변" },
    { href: "/admin/audit", label: "감사 로그", desc: "관리자 작업 이력" },
  ];

  return (
    <>
      <PageHeader title="관리자 대시보드" desc="운영 현황 한눈에 보기" />

      <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-2">
        {kpis.map((k) => (
          <StatCard
            key={k.label}
            label={k.label}
            value={k.value}
            tone={k.tone ?? "default"}
            hint={k.hint}
          />
        ))}
      </div>

      <div className="mt-6">
        <div className="text-sm font-[950] tracking-[-0.03em] text-gs-navy-900 mb-3">
          바로가기
        </div>
        <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
          {quickLinks.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="p-4 rounded-[14px] bg-white border border-gs-line-soft shadow-gs-card hover:shadow-gs-card-hover transition-all"
            >
              <div className="text-sm font-bold text-gs-text-strong">{m.label}</div>
              <div className="text-xs text-gs-muted mt-1">{m.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
