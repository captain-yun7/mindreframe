import Link from "next/link";
import { notFound } from "next/navigation";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { Card, CardTitle } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminUserActions } from "./admin-user-actions";
import { DeleteUserButton } from "./delete-user-button";

interface UserDetail {
  id: string;
  email: string;
  nickname: string;
  plan: string | null;
  plan_expires_at: string | null;
  role: string;
  phone_number: string | null;
  notification_hour: number;
  notifications_started_at: string | null;
  onboarding_completed: boolean | null;
  provider: string | null;
  created_at: string;
  deleted_at: string | null;
  telegram_chat_id: string | null;
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user: adminUser } = await requireAdmin();

  // deleted_at / telegram_chat_id 컬럼 미적용 환경 fallback — 단계적 재쿼리
  const baseCols =
    "id, email, nickname, plan, plan_expires_at, role, phone_number, notification_hour, notifications_started_at, onboarding_completed, provider, created_at";
  let userRes = await supabase
    .from("users")
    .select(`${baseCols}, deleted_at, telegram_chat_id`)
    .eq("id", id)
    .maybeSingle();
  if (
    userRes.error &&
    (userRes.error.code === "42703" ||
      /telegram_chat_id/.test(userRes.error.message))
  ) {
    userRes = await supabase
      .from("users")
      .select(`${baseCols}, deleted_at`)
      .eq("id", id)
      .maybeSingle();
  }
  if (
    userRes.error &&
    (userRes.error.code === "42703" || /deleted_at/.test(userRes.error.message))
  ) {
    userRes = await supabase.from("users").select(baseCols).eq("id", id).maybeSingle();
  }
  const user = userRes.data as UserDetail | null;
  if (!user) notFound();

  const [
    surveyRes,
    analysesCountRes,
    coachSessionsRes,
    recentNotificationsRes,
    paymentsRes,
  ] = await Promise.all([
    supabase
      .from("survey_responses")
      .select("depression_score, depression_severity, anxiety_score, anxiety_severity, recommended_track, completed_at")
      .eq("user_id", id)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("chat_analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id),
    supabase
      .from("coach_chat_sessions")
      .select("id, status, started_at, ended_at")
      .eq("user_id", id)
      .order("started_at", { ascending: false })
      .limit(10),
    supabase
      .from("notification_logs")
      .select("day_number, status, sent_at, error_message, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("payments")
      .select("amount, plan, status, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const survey = surveyRes.data;
  const analysesCount = analysesCountRes.count ?? 0;
  const coachSessions = coachSessionsRes.data ?? [];
  const notifications = recentNotificationsRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  return (
    <PageLayout>
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin/users" className="text-sm text-gs-blue">
          ← 사용자 목록
        </Link>
      </div>
      <PageTitle>{user.nickname}</PageTitle>
      <div className="text-xs text-gs-muted mb-4">{user.email}</div>

      {user.deleted_at && (
        <div className="mb-4 p-4 rounded-[14px] bg-gs-danger/10 border border-gs-danger/30 text-sm">
          이 사용자는{" "}
          <b>{new Date(user.deleted_at).toLocaleString("ko-KR")}</b>에 삭제되었습니다.
          모든 관리 액션은 비활성화됩니다.
        </div>
      )}

      <Card>
        <CardTitle>프로필</CardTitle>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm max-sm:grid-cols-1">
          <Row label="플랜" value={user.plan ?? "free"} />
          <Row
            label="만료일"
            value={user.plan_expires_at ? new Date(user.plan_expires_at).toLocaleDateString("ko-KR") : "-"}
          />
          <Row label="권한" value={user.role} />
          <Row label="가입 경로" value={user.provider ?? "email"} />
          <Row label="휴대폰" value={user.phone_number ?? "-"} />
          <Row label="알림 시간" value={`${user.notification_hour}시`} />
          <Row
            label="알림 시작일"
            value={user.notifications_started_at ?? "-"}
          />
          <Row label="온보딩" value={user.onboarding_completed ? "완료" : "미완료"} />
          <Row
            label="가입일"
            value={new Date(user.created_at).toLocaleDateString("ko-KR")}
          />
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>우울불안 검사</CardTitle>
        {survey ? (
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm max-sm:grid-cols-1">
            <Row label="우울 점수" value={`${survey.depression_score} (${survey.depression_severity})`} />
            <Row label="불안 점수" value={`${survey.anxiety_score} (${survey.anxiety_severity})`} />
            <Row label="추천 트랙" value={survey.recommended_track} />
            <Row
              label="완료일"
              value={new Date(survey.completed_at).toLocaleDateString("ko-KR")}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-gs-muted">검사 미완료</p>
        )}
      </Card>

      <Card className="mt-4">
        <CardTitle>관리자 직접 수정</CardTitle>
        <div className="mt-3">
          <AdminUserActions
            userId={user.id}
            currentPlan={user.plan ?? "free"}
            currentRole={user.role}
            currentNickname={user.nickname}
            currentNotificationHour={user.notification_hour}
            notificationsActive={!!user.notifications_started_at}
            isDeleted={!!user.deleted_at}
            currentTelegramChatId={user.telegram_chat_id ?? null}
          />
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>활동 요약</CardTitle>
        <div className="mt-3 text-sm">
          분석기 사용 <b>{analysesCount}</b>회
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>결제 이력 (최근 10)</CardTitle>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-gs-muted">결제 없음</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {payments.map((p, i) => (
              <li key={i} className="flex justify-between border-b border-gs-line-soft py-1">
                <span>
                  <b>{p.plan}</b> · {p.status}
                </span>
                <span className="text-gs-muted text-xs">
                  {p.amount.toLocaleString()}원 ·{" "}
                  {new Date(p.created_at).toLocaleDateString("ko-KR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4">
        <CardTitle>알림 발송 이력 (최근 10)</CardTitle>
        {notifications.length === 0 ? (
          <p className="mt-3 text-sm text-gs-muted">발송 이력 없음</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {notifications.map((n, i) => (
              <li
                key={i}
                className="flex justify-between border-b border-gs-line-soft py-1"
              >
                <span>
                  {n.day_number}일차 ·{" "}
                  <span
                    className={
                      n.status === "sent"
                        ? "text-gs-success"
                        : n.status === "failed"
                          ? "text-gs-danger"
                          : "text-gs-muted"
                    }
                  >
                    {n.status}
                  </span>
                  {n.error_message && (
                    <span className="text-[11px] text-gs-danger ml-2">{n.error_message}</span>
                  )}
                </span>
                <span className="text-gs-muted text-xs">
                  {new Date(n.sent_at ?? n.created_at).toLocaleString("ko-KR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {!user.deleted_at && user.role !== "admin" && user.id !== adminUser.id && (
        <Card className="mt-4 border-gs-danger/30">
          <CardTitle>위험 영역</CardTitle>
          <p className="mt-2 text-sm text-gs-muted">
            소프트 삭제 — auth 세션은 즉시 무효화되고, public.users 행은 deleted_at만
            마킹됩니다. 통계·결제 이력은 보존됩니다. 관리자 본인 또는 다른 관리자는
            삭제할 수 없습니다 (먼저 권한을 user로 강등하세요).
          </p>
          <div className="mt-3">
            <DeleteUserButton userId={user.id} nickname={user.nickname} />
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <CardTitle>코치 채팅 세션 (최근 10)</CardTitle>
        {coachSessions.length === 0 ? (
          <p className="mt-3 text-sm text-gs-muted">세션 없음</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {coachSessions.map((s) => (
              <li
                key={s.id}
                className="flex justify-between border-b border-gs-line-soft py-1"
              >
                <Link
                  href={`/admin/coach/${s.id}`}
                  className="text-gs-blue hover:underline"
                >
                  {s.status}
                </Link>
                <span className="text-gs-muted text-xs">
                  {new Date(s.started_at).toLocaleString("ko-KR")}
                  {s.ended_at && ` ~ ${new Date(s.ended_at).toLocaleString("ko-KR")}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gs-line-soft py-1">
      <span className="text-gs-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
