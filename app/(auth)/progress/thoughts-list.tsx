"use client";

import { useState, useTransition } from "react";
import { loadMoreThoughts } from "@/lib/actions/dashboard";
import { useToast } from "@/components/ui/toast";
import { formatDateTimeKst } from "@/lib/dates";

/**
 * K6·F208 — 생각쓰레기통 기록 "더 보기" 패턴.
 * GratitudeList와 동일 흐름 (created_at cursor).
 */

export interface ThoughtItem {
  id: string;
  situation: string;
  thought: string | null;
  emotion: string | null;
  body_reaction: string | null;
  behavior: string | null;
  created_at: string;
  sequence_no?: number | null;
}

export function ThoughtsList({ initial }: { initial: ThoughtItem[] }) {
  const [items, setItems] = useState<ThoughtItem[]>(initial);
  const [hasMore, setHasMore] = useState(initial.length >= 5);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (initial.length === 0) {
    return (
      <div className="mt-4 text-center text-gs-muted-soft text-[13px] py-6">
        생각쓰레기통에 기록을 남기면 여기에 모입니다.
      </div>
    );
  }

  const handleLoadMore = () => {
    const lastItem = items[items.length - 1];
    const cursor = lastItem?.created_at;
    if (!cursor) return;
    const lastSeq = lastItem?.sequence_no ?? null;
    startTransition(async () => {
      const r = await loadMoreThoughts(cursor, 20);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      const enriched = (r.entries as ThoughtItem[]).map((e, i) => ({
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
      <ul className="mt-4 space-y-2" data-testid="recent-thoughts">
        {items.map((t) => {
          const seqNo = t.sequence_no ?? null;
          return (
            <li
              key={t.id}
              className="p-3 rounded-[12px] bg-gs-navy-50/60 border border-gs-line-soft text-[13px]"
            >
              <div className="text-gs-muted-soft text-[11px] mb-1 flex items-center justify-between flex-wrap gap-1">
                <span>{formatDateTimeKst(t.created_at)}</span>
                {seqNo && seqNo > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff5ec] border border-gs-gold-border px-2 py-0.5 text-[10.5px] font-extrabold text-gs-navy">
                    🗑️ 생각 분리 레벨 UP {seqNo}
                  </span>
                ) : null}
              </div>
              <div className="font-bold">{t.situation}</div>
              {t.thought && <div className="text-gs-text-soft mt-0.5">생각 · {t.thought}</div>}
              {t.emotion && <div className="text-gs-text-soft">감정 · {t.emotion}</div>}
              {t.body_reaction && (
                <div className="text-gs-text-soft">신체반응 · {t.body_reaction}</div>
              )}
              {t.behavior && <div className="text-gs-text-soft">행동 · {t.behavior}</div>}
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={pending}
          data-testid="thoughts-load-more"
          className="mt-4 w-full py-3 rounded-full border border-gs-line-soft bg-white text-sm font-bold text-gs-text-strong hover:-translate-y-0.5 hover:shadow-toss-card transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40"
        >
          {pending ? "불러오는 중…" : "더 보기"}
        </button>
      )}
    </>
  );
}
