import { redirect } from "next/navigation";
import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { Card } from "@/components/card";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  getCoachWeeklyLimit,
  normalizePlan,
  isPlanGateEnabled,
  planAtLeast,
} from "@/lib/auth/plan";
import type {
  CoachMessage,
  CoachSessionSummary,
} from "@/lib/actions/coach-chat";
import { CoachChatClient } from "./coach-chat-client";

export default async function CoachPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // plan/count/sessions 병렬 로드 (server action 우회 → getUser 중복 호출 제거)
  const [userRowRes, usedRes, sessionsRes] = await Promise.all([
    supabase.from("users").select("plan").eq("id", user.id).single(),
    supabase.rpc("count_coach_sessions_this_week", { p_user_id: user.id }),
    supabase
      .from("coach_chat_sessions")
      .select("id, status, started_at, ended_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  const plan = normalizePlan(userRowRes.data?.plan);

  // 플랜 가드
  if (isPlanGateEnabled() && !planAtLeast(plan, "light")) {
    return (
      <PageLayout>
        <PageTitle>코치와 1:1 채팅</PageTitle>
        <PageLead>1:1 상담사 채팅은 라이트 이상 플랜에서 이용할 수 있어요.</PageLead>
        <Card className="mt-4 p-6 text-center">
          <p className="text-sm text-gs-text-soft mb-4">
            현재 플랜: <b>{plan}</b>
          </p>
          <a
            href="/pricing"
            className="inline-block px-6 py-3 rounded-full bg-gs-gold text-gs-navy font-bold"
          >
            플랜 업그레이드
          </a>
        </Card>
      </PageLayout>
    );
  }

  const limit = getCoachWeeklyLimit(plan);
  const used = (usedRes.data as number | null) ?? 0;
  const sessions = (sessionsRes.data ?? []) as CoachSessionSummary[];
  const activeSession = sessions.find((s) => s.status === "active") ?? null;

  // 활성 세션이 있으면 메시지도 로드
  let initialMessages: CoachMessage[] = [];
  if (activeSession) {
    const { data: msgs } = await supabase
      .from("coach_chat_messages")
      .select("id, sender_role, content, created_at")
      .eq("session_id", activeSession.id)
      .order("created_at", { ascending: true });
    initialMessages = (msgs ?? []) as CoachMessage[];
  }

  return (
    <PageLayout>
      <PageTitle>코치와 1:1 채팅</PageTitle>
      <PageLead>
        궁금한 점·고민을 상담사에게 편하게 적어주세요. 평일 24시간 이내 답변드려요.
      </PageLead>

      <Card className="mt-4 p-4 flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-2">
        <div className="text-sm">
          <span className="text-gs-muted">이번 주 사용 </span>
          <b>{used}</b>
          <span className="text-gs-muted"> / {limit}회</span>
        </div>
        <div className="text-xs text-gs-muted">
          1회 = 한 번의 대화 세션 (대화 안에서 메시지 무제한)
        </div>
      </Card>

      <CoachChatClient
        activeSession={activeSession ?? undefined}
        initialMessages={initialMessages}
        canStartNew={used < limit}
        pastSessions={sessions.filter((s) => s.status === "ended").slice(0, 5)}
      />
    </PageLayout>
  );
}
