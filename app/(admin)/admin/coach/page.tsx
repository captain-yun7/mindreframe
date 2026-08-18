import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "../_ui/page-header";
import { Card } from "@/components/card";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { listActiveSessionsForCoach } from "@/lib/actions/coach-chat";

export default async function CoachAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const status = tab === "ended" ? ("ended" as const) : ("active" as const);
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
      <>
        <PageHeader title="접근 권한 없음" desc="코치 또는 관리자 권한이 필요해요." />
      </>
    );
  }

  const r = await listActiveSessionsForCoach(status);
  const sessions = r.ok ? r.sessions : [];

  return (
    <>
      <PageHeader
        title="코치 어드민"
        desc={
          status === "ended"
            ? `종료된 대화 ${sessions.length}건 (최근 100건)`
            : `활성 대화 ${sessions.length}건`
        }
      />

      <div className="mt-4 flex gap-2">
        <TabLink href="/admin/coach" active={status === "active"}>
          진행 중
        </TabLink>
        <TabLink href="/admin/coach?tab=ended" active={status === "ended"}>
          종료된 대화
        </TabLink>
      </div>

      {sessions.length === 0 ? (
        <Card className="mt-4 p-6 text-center text-gs-muted text-sm">
          {status === "ended" ? "종료된 대화가 없어요." : "현재 활성 대화가 없어요."}
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
    </>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-[13px] font-bold transition-colors ${
        active
          ? "bg-gs-navy-900 text-white"
          : "bg-white border border-gs-line-soft text-gs-muted hover:text-gs-navy-900"
      }`}
    >
      {children}
    </Link>
  );
}
