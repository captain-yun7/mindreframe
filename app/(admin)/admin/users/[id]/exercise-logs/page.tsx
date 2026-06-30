import { PageHeader } from "../../../_ui/page-header";
import { requireCoachOrAdmin } from "@/lib/auth/admin";
import { listExerciseLogsForCoach } from "@/lib/actions/coach-exercise-view";

export const dynamic = "force-dynamic";

export default async function AdminUserExerciseLogsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // F82 — coach role도 동의자 행동연습장을 열람해야 하므로 coach/admin 둘 다 허용.
  // server action `listExerciseLogsForCoach`도 동일 가드 사용.
  await requireCoachOrAdmin();

  const r = await listExerciseLogsForCoach(id, 50);

  return (
    <>
      <PageHeader
        backHref={`/admin/users/${id}`}
        backLabel="← 사용자 상세"
        title="행동연습장 기록"
      />

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
    </>
  );
}
