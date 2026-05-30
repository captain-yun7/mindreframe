"use client";

import { useState, useTransition } from "react";
import { loadMoreExercises } from "@/lib/actions/dashboard";
import { useToast } from "@/components/ui/toast";
import { formatDateTimeKst } from "@/lib/dates";
import { parseExerciseNote } from "@/lib/exercise-payload";

/**
 * K6·F208·F210 — 행동연습장 기록 "더 보기" + row별 용기 레벨 카운트.
 *  - F210 sequence_no 기반 row별 "용기 레벨 N" (오래된 순 1, 2, 3…에 floor((rn-1)/5)+1)
 *    → 같은 레벨이 여러 row일 때 단순 중복 표기 대신 도전 카운트와 함께 표시 (예: "용기 레벨 1 · 3번째 도전")
 */

export interface ExerciseItem {
  id: string;
  exercise_key: string;
  exercise_title: string;
  note: string | null;
  completed_at: string;
  sequence_no?: number | null;
}

export function ExercisesList({ initial }: { initial: ExerciseItem[] }) {
  const [items, setItems] = useState<ExerciseItem[]>(initial);
  const [hasMore, setHasMore] = useState(initial.length >= 5);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (initial.length === 0) {
    return (
      <div className="mt-4 text-center text-gs-muted-soft text-[13px] py-6">
        행동연습장에서 기록을 저장하면 여기에 모입니다.
      </div>
    );
  }

  const handleLoadMore = () => {
    const lastItem = items[items.length - 1];
    const cursor = lastItem?.completed_at;
    if (!cursor) return;
    const lastSeq = lastItem?.sequence_no ?? null;
    startTransition(async () => {
      const r = await loadMoreExercises(cursor, 20);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      // F225 — descending 순서이므로 lastSeq - 1, -2 ...
      const enriched = (r.entries as ExerciseItem[]).map((e, i) => ({
        ...e,
        sequence_no:
          lastSeq != null && lastSeq - 1 - i > 0 ? lastSeq - 1 - i : null,
      }));
      setItems((prev) => [...prev, ...enriched]);
      setHasMore(r.hasMore);
    });
  };

  return (
    <>
      <ul className="mt-4 space-y-2" data-testid="recent-exercises">
        {items.map((e) => {
          const parsed = parseExerciseNote(e.note as string | null);
          const isNew =
            "type" in parsed &&
            (parsed.type === "anxiety_exposure" ||
              parsed.type === "depress_activity");
          const isLegacy =
            !isNew && "__legacy" in parsed && parsed.__legacy === true;
          const modeLabel =
            isNew && parsed.type === "anxiety_exposure"
              ? "불안 줄이기"
              : isNew && parsed.type === "depress_activity"
                ? "우울 벗어나기"
                : e.exercise_key === "courage"
                  ? "용기있는 행동"
                  : "불안노출";
          const seqNo = e.sequence_no ?? null;
          return (
            <li
              key={e.id}
              className="p-3 rounded-[12px] bg-gs-navy-50/60 border border-gs-line-soft text-[13px]"
            >
              <div className="text-gs-muted-soft text-[11px] mb-1 flex items-center justify-between flex-wrap gap-1">
                <span>
                  {modeLabel} · {formatDateTimeKst(e.completed_at)}
                </span>
                {seqNo && seqNo > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff5ec] border border-gs-gold-border px-2 py-0.5 text-[10.5px] font-extrabold text-gs-navy">
                    🏆 용기 레벨 UP {seqNo}
                  </span>
                ) : null}
              </div>
              <div className="font-bold">{e.exercise_title}</div>
              {isNew && parsed.type === "anxiety_exposure" && (
                <div className="mt-1 space-y-0.5 text-gs-text-soft">
                  <div>
                    {parsed.did === "did" ? "✓ 도전함" : "✕ 못 함"}
                    {parsed.actualBefore != null && parsed.actualAfter != null && (
                      <> {" · "}불안 {parsed.actualBefore} → {parsed.actualAfter}</>
                    )}
                  </div>
                  {parsed.learnedLine && (
                    <div className="text-gs-muted-soft text-[12px]">
                      💭 {parsed.learnedLine}
                    </div>
                  )}
                  {parsed.unexpectedThought && (
                    <div className="text-gs-muted-soft text-[12px] italic">
                      🤔 예상치 못한 생각 · {parsed.unexpectedThought}
                    </div>
                  )}
                </div>
              )}
              {isNew && parsed.type === "depress_activity" && (
                <div className="mt-1 space-y-0.5 text-gs-text-soft">
                  <div>
                    {parsed.did === "did" ? "✓ 실행함" : "✕ 못 함"}
                    {parsed.actualAfter != null && (
                      <> {" · "}활동 후 기분 {parsed.actualAfter}</>
                    )}
                  </div>
                  {parsed.learnedLine && (
                    <div className="text-gs-muted-soft text-[12px]">
                      💭 {parsed.learnedLine}
                    </div>
                  )}
                  {parsed.unexpectedThought && (
                    <div className="text-gs-muted-soft text-[12px] italic">
                      🤔 예상치 못한 생각 · {parsed.unexpectedThought}
                    </div>
                  )}
                </div>
              )}
              {isLegacy && "plan" in parsed && (
                <div className="mt-1 space-y-0.5 text-gs-text-soft">
                  {parsed.plan?.when && <div>📅 {parsed.plan.when}</div>}
                  {parsed.plan?.whereWho && <div>📍 {parsed.plan.whereWho}</div>}
                  {parsed.execution && (
                    <div>
                      {parsed.execution.did ? "✓ 실행함" : "✕ 못 함"}
                      {parsed.execution.before != null &&
                        parsed.execution.after != null && (
                          <>
                            {" · "}
                            {e.exercise_key === "courage" ? "기분" : "불안"}{" "}
                            {parsed.execution.before} → {parsed.execution.after}
                          </>
                        )}
                    </div>
                  )}
                  {parsed.reflection && (
                    <div className="mt-1 text-gs-muted-soft text-[12px]">
                      💭 {parsed.reflection}
                    </div>
                  )}
                </div>
              )}
              {!isNew && !isLegacy && "plain" in parsed && parsed.plain && (
                <div className="text-gs-text-soft mt-0.5">{parsed.plain}</div>
              )}
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={pending}
          data-testid="exercises-load-more"
          className="mt-4 w-full py-3 rounded-full border border-gs-line-soft bg-white text-sm font-bold text-gs-text-strong hover:-translate-y-0.5 hover:shadow-toss-card transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40"
        >
          {pending ? "불러오는 중…" : "더 보기"}
        </button>
      )}
    </>
  );
}
