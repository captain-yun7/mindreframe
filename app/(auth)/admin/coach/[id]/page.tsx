import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCoachMessages } from "@/lib/actions/coach-chat";
import { CoachReplyClient } from "./coach-reply-client";

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
  if (u?.role !== "coach") redirect("/admin/coach");

  // 세션 + 유저 정보
  const { data: session } = await supabase
    .from("coach_chat_sessions")
    .select("id, status, started_at, ended_at, user_id, users:user_id (nickname, plan)")
    .eq("id", id)
    .single();
  if (!session) notFound();

  // supabase 조인 결과 — single() 시점에선 객체. 타입은 unknown 거쳐서 단언.
  const sessionUser = session.users as unknown as
    | { nickname: string; plan: string | null }
    | null;

  const msgRes = await getCoachMessages(id);
  const messages = msgRes.ok ? msgRes.messages : [];

  return (
    <PageLayout>
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin/coach" className="text-sm text-gs-blue">
          ← 목록
        </Link>
      </div>
      <PageTitle>
        {sessionUser?.nickname ?? "사용자"} 님과의 대화
      </PageTitle>
      <div className="text-xs text-gs-muted mb-4">
        플랜 · {sessionUser?.plan ?? "free"} · 시작{" "}
        {new Date(session.started_at).toLocaleString("ko-KR")} · 상태{" "}
        {session.status}
      </div>

      <CoachReplyClient
        sessionId={id}
        initialMessages={messages}
        sessionStatus={session.status as "active" | "ended"}
      />
    </PageLayout>
  );
}
