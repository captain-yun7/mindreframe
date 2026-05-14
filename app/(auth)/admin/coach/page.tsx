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

  if (u?.role !== "coach") {
    return (
      <PageLayout>
        <PageTitle>접근 권한 없음</PageTitle>
        <PageLead>상담사 권한이 필요해요.</PageLead>
      </PageLayout>
    );
  }

  const r = await listActiveSessionsForCoach();
  const sessions = r.ok ? r.sessions : [];

  return (
    <PageLayout>
      <PageTitle>상담사 어드민</PageTitle>
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
                className="block p-4 rounded-[14px] bg-white border border-gs-line-soft hover:shadow-gs-card-hover transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-sm">{s.nickname}</div>
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
