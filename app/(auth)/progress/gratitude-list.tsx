"use client";

import { useState, useTransition } from "react";
import { loadMoreGratitudes } from "@/lib/actions/dashboard";
import { useToast } from "@/components/ui/toast";

type Gratitude = {
  id: string;
  content: string;
  recorded_at: string;
  created_at: string;
};

export function GratitudeList({ initial }: { initial: Gratitude[] }) {
  const [items, setItems] = useState<Gratitude[]>(initial);
  // 초기 5개가 꽉 차 있으면 추가 가능성 있음. 실제 hasMore는 첫 호출 응답으로 확정.
  const [hasMore, setHasMore] = useState(initial.length >= 5);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (initial.length === 0) {
    return (
      <div className="mt-4 text-center text-gs-muted text-[13px] py-6">
        오늘의 루틴에서 감사일기를 저장하면 여기에 모입니다.
      </div>
    );
  }

  const handleLoadMore = () => {
    const lastCursor = items[items.length - 1]?.created_at;
    if (!lastCursor) return;
    startTransition(async () => {
      const r = await loadMoreGratitudes(lastCursor, 20);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      setItems((prev) => [...prev, ...r.entries]);
      setHasMore(r.hasMore);
    });
  };

  return (
    <>
      <ul className="mt-4 space-y-2" data-testid="recent-gratitudes">
        {items.map((g) => (
          <li
            key={g.id}
            className="p-3 rounded-[12px] bg-gs-surface-muted border border-gs-line-soft text-[13px]"
          >
            <div className="text-gs-muted text-[11px] mb-1">{g.recorded_at}</div>
            <div>{g.content}</div>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={pending}
          data-testid="gratitude-load-more"
          className="mt-3 w-full py-3 rounded-[12px] border border-gs-line-soft bg-white text-sm font-bold text-gs-text-soft hover:bg-gs-surface-mid disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40"
        >
          {pending ? "불러오는 중..." : "더 보기"}
        </button>
      )}
    </>
  );
}
