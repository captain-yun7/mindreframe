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
  const [openItem, setOpenItem] = useState<ThoughtItem | null>(null);
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
              {/* F226 — 전체 보기 (5요소 모달 — schema 변경 없이 간단 모달) */}
              <button
                type="button"
                onClick={() => setOpenItem(t)}
                className="mt-2 text-xs font-bold text-gs-navy-bright hover:text-gs-navy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40 rounded"
              >
                전체 보기 →
              </button>
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

      {openItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="생각쓰레기통 기록 전체 보기"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpenItem(null)}
        >
          <div
            className="bg-white w-full max-w-[560px] max-h-[80vh] rounded-[18px] shadow-gs-dropdown flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-gs-line-soft flex items-center justify-between">
              <h3 className="text-base font-bold">생각쓰레기통 기록</h3>
              <button
                type="button"
                onClick={() => setOpenItem(null)}
                aria-label="닫기"
                className="text-gs-muted hover:text-gs-text-strong text-lg leading-none px-2"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-[14px] leading-[1.7]">
              <div className="text-gs-muted-soft text-[12px]">
                {formatDateTimeKst(openItem.created_at)}
              </div>
              <Field label="상황" value={openItem.situation} />
              <Field label="생각" value={openItem.thought} />
              <Field label="감정" value={openItem.emotion} />
              <Field label="신체반응" value={openItem.body_reaction} />
              <Field label="행동" value={openItem.behavior} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[11.5px] font-bold text-gs-navy-bright mb-0.5">
        {label}
      </div>
      <div className="text-gs-text-strong whitespace-pre-wrap">{value}</div>
    </div>
  );
}
