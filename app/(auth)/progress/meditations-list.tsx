"use client";

import { useState, useTransition } from "react";
import { loadMoreMeditations } from "@/lib/actions/dashboard";
import { useToast } from "@/components/ui/toast";
import { formatDateTimeKst } from "@/lib/dates";

/**
 * K6·F208·F212·F213 — 명상 기록 "더 보기".
 *  - F212 row별 "명상 레벨 N" 표시 (합산 배지 제거, sequence_no 기반 산정)
 *  - F213 "0분" 표기 제거 — duration < 60s row는 시간 텍스트만 숨김
 */

export interface MeditationItem {
  id: string;
  track_title: string;
  duration: number | null;
  completed_at: string;
  /** RPC v5에서 부여한 오래된 순 카운트 (1, 2, 3…) */
  sequence_no?: number | null;
}

// 명상 레벨 산식 — RPC v5 동일 (n < 1 → 0, n < 10 → 1, n < 30 → 2, n < 60 → 3, 이후 +30마다 +1)
function meditationLevelOf(seqNo: number): number {
  if (seqNo < 1) return 0;
  if (seqNo < 10) return 1;
  if (seqNo < 30) return 2;
  if (seqNo < 60) return 3;
  return 4 + Math.floor((seqNo - 60) / 30);
}

export function MeditationsList({ initial }: { initial: MeditationItem[] }) {
  const [items, setItems] = useState<MeditationItem[]>(initial);
  const [hasMore, setHasMore] = useState(initial.length >= 5);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (initial.length === 0) {
    return (
      <div className="mt-4 text-center text-gs-muted-soft text-[13px] py-6">
        명상 트랙을 재생/완료하면 여기에 모입니다.
      </div>
    );
  }

  const handleLoadMore = () => {
    const cursor = items[items.length - 1]?.completed_at;
    if (!cursor) return;
    startTransition(async () => {
      const r = await loadMoreMeditations(cursor, 20);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      setItems((prev) => [...prev, ...(r.entries as MeditationItem[])]);
      setHasMore(r.hasMore);
    });
  };

  return (
    <>
      <ul className="mt-4 space-y-2" data-testid="recent-meditations">
        {items.map((m) => {
          const minutes = Math.round((m.duration ?? 0) / 60);
          const seqNo = m.sequence_no ?? 0;
          const level = meditationLevelOf(seqNo);
          return (
            <li
              key={m.id}
              className="p-3 rounded-[12px] bg-gs-navy-50/60 border border-gs-line-soft text-[13px] flex justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-1.5">
                  <div className="font-bold truncate">{m.track_title}</div>
                  {level > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fff5ec] border border-gs-gold-border px-2 py-0.5 text-[10.5px] font-extrabold text-gs-navy">
                      🧘 명상 레벨 {level}
                    </span>
                  ) : null}
                </div>
                <div className="text-gs-muted-soft text-[11px] mt-0.5">
                  {formatDateTimeKst(m.completed_at)}
                </div>
              </div>
              {minutes > 0 ? (
                <div className="text-gs-muted-soft text-xs self-center shrink-0">
                  {minutes}분
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={pending}
          data-testid="meditations-load-more"
          className="mt-4 w-full py-3 rounded-full border border-gs-line-soft bg-white text-sm font-bold text-gs-text-strong hover:-translate-y-0.5 hover:shadow-toss-card transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40"
        >
          {pending ? "불러오는 중…" : "더 보기"}
        </button>
      )}
    </>
  );
}
