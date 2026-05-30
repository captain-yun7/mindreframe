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
    const lastItem = items[items.length - 1];
    const cursor = lastItem?.completed_at;
    if (!cursor) return;
    const lastSeq = lastItem?.sequence_no ?? null;
    startTransition(async () => {
      const r = await loadMoreMeditations(cursor, 20);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      const enriched = (r.entries as MeditationItem[]).map((e, i) => ({
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
      <ul className="mt-4 space-y-2" data-testid="recent-meditations">
        {items.map((m) => {
          const minutes = Math.round((m.duration ?? 0) / 60);
          const seqNo = m.sequence_no ?? null;
          return (
            <li
              key={m.id}
              className="p-3 rounded-[12px] bg-gs-navy-50/60 border border-gs-line-soft text-[13px]"
            >
              {/* F225 — 배지 위치 다른 list와 통일: 일자 옆 (top row) */}
              <div className="text-gs-muted-soft text-[11px] mb-1 flex items-center justify-between flex-wrap gap-1">
                <span>{formatDateTimeKst(m.completed_at)}</span>
                {seqNo && seqNo > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff5ec] border border-gs-gold-border px-2 py-0.5 text-[10.5px] font-extrabold text-gs-navy">
                    🧘 명상 레벨 UP {seqNo}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold truncate flex-1">{m.track_title}</div>
                {minutes > 0 ? (
                  <div className="text-gs-muted-soft text-xs shrink-0">
                    {minutes}분
                  </div>
                ) : null}
              </div>
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
