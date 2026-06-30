import { redirect, notFound } from "next/navigation";
import { PageHeader } from "../../_ui/page-header";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  getCoachThreadForUser,
} from "@/lib/actions/coach-chat";
import { listCoachNotes } from "@/lib/actions/coach-notes";
import {
  getCoachWeeklyLimit,
  normalizePlan,
} from "@/lib/auth/plan";
import {
  daysSinceWeekStartKst,
  getCoachWarningLevel,
} from "@/lib/admin/coach-warning";
import { computeDayNumber } from "@/lib/coach/day-number";
import { CoachReplyClient } from "./coach-reply-client";
import { CoachUserInfoPanel } from "./coach-user-info-panel";
import { CoachNotesPanel } from "./coach-notes-panel";

export default async function CoachAdminSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: u } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (u?.role !== "coach" && u?.role !== "admin") redirect("/admin/coach");

  // 세션 + 사용자 부가 정보 (deleted_at / coach_session_adjustment / notifications_started_at fallback)
  // J5 / F152: phone_number, notification_hour 추가
  const baseSelect =
    "id, status, started_at, ended_at, user_id, " +
    "users:user_id (id, nickname, email, plan, plan_expires_at, " +
    "phone_number, notification_hour, " +
    "notifications_started_at, coach_session_adjustment, created_at)";
  type SessionUserRow = {
    id?: string;
    nickname?: string | null;
    email?: string | null;
    plan?: string | null;
    plan_expires_at?: string | null;
    phone_number?: string | null;
    notification_hour?: number | null;
    notifications_started_at?: string | null;
    coach_session_adjustment?: number | null;
    created_at?: string | null;
  };
  type SessionRow = {
    id: string;
    status: "active" | "ended";
    started_at: string;
    ended_at: string | null;
    user_id: string;
    users: SessionUserRow | null;
  };
  let sessionRow: SessionRow | null;
  {
    const res = await supabase
      .from("coach_chat_sessions")
      .select(baseSelect)
      .eq("id", id)
      .single();
    if (
      res.error &&
      (res.error.code === "42703" ||
        /coach_session_adjustment|notifications_started_at|plan_expires_at|email|phone_number|notification_hour/.test(
          res.error.message,
        ))
    ) {
      const r2 = await supabase
        .from("coach_chat_sessions")
        .select(
          "id, status, started_at, ended_at, user_id, users:user_id (id, nickname, plan)",
        )
        .eq("id", id)
        .single();
      sessionRow = (r2.data as unknown as SessionRow) ?? null;
    } else {
      sessionRow = (res.data as unknown as SessionRow) ?? null;
    }
  }
  if (!sessionRow) {
    notFound();
  }
  const userId: string = sessionRow.user_id;
  const su: SessionUserRow | null = sessionRow.users;

  // 단일 스레드 로딩 + 부가 데이터 병렬
  const [threadRes, usedRes, notesRes] = await Promise.all([
    getCoachThreadForUser(userId),
    supabase.rpc("count_coach_sessions_this_week", { p_user_id: userId }),
    listCoachNotes(userId),
  ]);

  const thread = threadRes.ok
    ? threadRes.thread
    : { sessions: [], messages: [], activeSession: null };

  const plan = normalizePlan(su?.plan);
  const limit = getCoachWeeklyLimit(plan);
  const used = (usedRes.data as number | null) ?? 0;
  const dayNumber = computeDayNumber(su?.notifications_started_at);
  const daysIntoWeek = daysSinceWeekStartKst();
  const warning = getCoachWarningLevel(plan, daysIntoWeek, used);

  return (
    <>
      <PageHeader
        backHref="/admin/coach"
        title={`${su?.nickname ?? "사용자"} 님과의 대화`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mt-2">
        <CoachReplyClient
          sessionId={id}
          sessions={thread.sessions}
          initialMessages={thread.messages}
          activeSession={thread.activeSession}
        />
        <aside className="space-y-3">
          <CoachUserInfoPanel
            userId={userId}
            nickname={su?.nickname ?? null}
            email={su?.email ?? null}
            plan={plan}
            planExpiresAt={su?.plan_expires_at ?? null}
            createdAt={su?.created_at ?? null}
            notificationsStartedAt={su?.notifications_started_at ?? null}
            phoneNumber={su?.phone_number ?? null}
            notificationHour={su?.notification_hour ?? null}
            dayNumber={dayNumber}
            usedThisWeek={used}
            weeklyLimit={limit}
            adjustment={su?.coach_session_adjustment ?? 0}
            warning={warning}
          />
          <CoachNotesPanel
            userId={userId}
            initialNotes={notesRes.ok ? notesRes.notes : []}
            viewerRole={notesRes.ok ? notesRes.viewerRole : "coach"}
            viewerId={notesRes.ok ? notesRes.viewerId : user.id}
          />
        </aside>
      </div>
    </>
  );
}
