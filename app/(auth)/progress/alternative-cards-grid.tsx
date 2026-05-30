"use client";

import { useState } from "react";
import { AlternativeThoughtCard } from "@/components/alternative-thought-card";

interface AlternativeCard {
  key: string;
  text: string;
}

interface Props {
  cards: AlternativeCard[];
  /** 초기에 보여줄 개수. 기본 6. */
  initialVisible?: number;
  /** 더 보기 클릭당 추가 노출. 기본 6. */
  step?: number;
}

/**
 * F220 — 대안적 사고 카드 더보기 패턴.
 * 모든 카드는 server에서 미리 만들어 props로 받음. 클라이언트는 노출 개수만 관리.
 */
export function AlternativeCardsGrid({
  cards,
  initialVisible = 6,
  step = 6,
}: Props) {
  const [visible, setVisible] = useState(initialVisible);
  const shown = cards.slice(0, visible);
  const hasMore = visible < cards.length;

  return (
    <>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* F221 — 최신 카드일수록 큰 번호. 가장 오래된 = 1, 가장 최신 = 총 개수. */}
        {shown.map((c, idx) => (
          <AlternativeThoughtCard
            key={c.key}
            text={c.text}
            index={cards.length - idx}
          />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + step)}
          className="mt-4 w-full py-3 rounded-full border border-gs-line-soft bg-white text-sm font-bold text-gs-text-strong hover:-translate-y-0.5 hover:shadow-toss-card transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40"
        >
          더 보기 ({cards.length - visible}개 남음)
        </button>
      )}
    </>
  );
}
