import { redirect } from "next/navigation";
import Link from "next/link";
import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { Card } from "@/components/card";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { listActiveSessionsForCoach } from "@/lib/actions/coach-chat";

export default async function CoachAdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: u } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // 코치 또는 관리자만 접근 가능 (관리자는 모니터링)
  if (u?.role !== "coach" && u?.role !== "admin") {
    return (
      <PageLayout>
        <PageTitle>접근 권한 없음</PageTitle>
        <PageLead>코치 또는 관리자 권한이 필요해요.</PageLead>
      </PageLayout>
    );
  }

  const r = await listActiveSessionsForCoach();
  const sessions = r.ok ? r.sessions : [];

  return (
    <PageLayout>
      <PageTitle>코치 어드민</PageTitle>
      <PageLead>활성 대화 {sessions.length}건</PageLead>

      {sessions.length === 0 ? (
        <Card className="mt-4 p-6 text-center text-gs-muted text-sm">
          현재 활성 대화가 없어요.
        </Card>
      ) : (
        <ul className="mt-4 space-y-2">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/coach/${s.id}`}
                className={
                  "block p-4 rounded-toss-card bg-white border hover:shadow-toss-card-hover transition-shadow " +
                  (s.coach_warning === "red"
                    ? "border-l-4 border-l-gs-danger border-gs-line-soft"
                    : "border-gs-line-soft")
                }
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      {s.coach_warning === "red" && (
                        <span
                          aria-label="플랜 미달"
                          title="이번 주 코칭 0회"
                          className="text-gs-danger"
                        >
                          ⚠️
                        </span>
                      )}
                      <span className="font-bold text-sm">{s.nickname}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gs-blue-light text-gs-blue font-bold uppercase">
                        {s.plan}
                      </span>
                    </div>
                    <div className="text-xs text-gs-muted mt-0.5">
                      시작 · {new Date(s.started_at).toLocaleString("ko-KR")}
                    </div>
                  </div>
                  {s.last_message_at && (
                    <div className="text-[10px] text-gs-muted">
                      최근 ·{" "}
                      {new Date(s.last_message_at).toLocaleString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
                {s.last_message_preview && (
                  <div className="mt-2 text-xs text-gs-text-soft truncate">
                    {s.last_message_preview}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
