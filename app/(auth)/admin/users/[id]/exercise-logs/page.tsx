import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { requireAdmin } from "@/lib/auth/admin";
import { listExerciseLogsForCoach } from "@/lib/actions/coach-exercise-view";

export const dynamic = "force-dynamic";

export default async function AdminUserExerciseLogsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // requireAdmin은 페이지 권한 가드 — 코치 라우트는 분석 보고서 결정상 admin/users 경로 통합
  await requireAdmin();

  const r = await listExerciseLogsForCoach(id, 50);

  return (
    <PageLayout>
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/admin/users/${id}`} className="text-sm text-gs-blue">
          ← 사용자 상세
        </Link>
      </div>
      <PageTitle>행동연습장 기록</PageTitle>

      {!r.ok ? (
        <div className="mt-6 p-6 bg-white rounded-[14px] border border-gs-line-soft text-sm text-gs-muted">
          {r.error}
        </div>
      ) : r.logs.length === 0 ? (
        <div className="mt-6 p-6 bg-white rounded-[14px] border border-gs-line-soft text-sm text-gs-muted">
          기록이 없어요.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {r.logs.map((log) => (
            <li
              key={log.id}
              className="bg-white rounded-[14px] p-4 border border-gs-line-soft"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold">
                  {log.exercise_title ?? log.exercise_key ?? "기록"}
                </div>
                <time className="text-xs text-gs-muted shrink-0">
                  {log.completed_at
                    ? new Date(log.completed_at).toLocaleString("ko-KR")
                    : "-"}
                </time>
              </div>
              {log.note && (
                <pre className="mt-2 text-sm text-gs-text-soft whitespace-pre-wrap break-words font-sans leading-[1.6]">
                  {log.note}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
