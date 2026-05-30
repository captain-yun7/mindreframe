"use client";

import { useState, useTransition } from "react";
import { loadMoreGratitudes } from "@/lib/actions/dashboard";
import { useToast } from "@/components/ui/toast";

type Gratitude = {
  id: string;
  content: string;
  recorded_at: string;
  created_at: string;
  /** RPC v5 — 오래된 순 카운트 (없으면 row별 레벨 표시 생략) */
  sequence_no?: number | null;
};


export function GratitudeList({ initial }: { initial: Gratitude[] }) {
  const [items, setItems] = useState<Gratitude[]>(initial);
  // 초기 5개가 꽉 차 있으면 추가 가능성 있음. 실제 hasMore는 첫 호출 응답으로 확정.
  const [hasMore, setHasMore] = useState(initial.length >= 5);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (initial.length === 0) {
    return (
      <div className="mt-4 text-center text-gs-muted-soft text-[13px] py-6">
        오늘의 루틴에서 감사일기를 저장하면 여기에 모입니다.
      </div>
    );
  }

  const handleLoadMore = () => {
    const lastItem = items[items.length - 1];
    const lastCursor = lastItem?.created_at;
    if (!lastCursor) return;
    // F223 — 더보기로 가져온 row에도 sequence_no 추정 (descending이므로 -1씩 감소).
    const lastSeq = lastItem?.sequence_no ?? null;
    startTransition(async () => {
      const r = await loadMoreGratitudes(lastCursor, 20);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      const enriched = r.entries.map((e, i) => ({
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
      <ul className="mt-4 space-y-2" data-testid="recent-gratitudes">
        {items.map((g) => {
          const seqNo = g.sequence_no ?? null;
          return (
            <li
              key={g.id}
              className="p-3 rounded-[12px] bg-gs-navy-50/60 border border-gs-line-soft text-[13px]"
            >
              <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                <div className="text-gs-muted-soft text-[11px]">{g.recorded_at}</div>
                {seqNo && seqNo > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff5ec] border border-gs-gold-border px-2 py-0.5 text-[10.5px] font-extrabold text-gs-navy">
                    🙏 긍정 레벨 UP {seqNo}
                  </span>
                ) : null}
              </div>
              <div>{g.content}</div>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={pending}
          data-testid="gratitude-load-more"
          className="mt-4 w-full py-3 rounded-full border border-gs-line-soft bg-white text-sm font-bold text-gs-text-strong hover:-translate-y-0.5 hover:shadow-toss-card transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40"
        >
          {pending ? "불러오는 중…" : "더 보기"}
        </button>
      )}
    </>
  );
}
