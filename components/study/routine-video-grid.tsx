"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getRoutineVideosBatch,
  getRoutineVideoSignedUrl,
  type RoutineVideoMeta,
} from "@/lib/actions/study-videos";

/**
 * /study 하단 "100일 루틴 3분 영상" 그리드.
 * - 데스크탑 4열 / 태블릿 2열 / 모바일 1열
 * - IntersectionObserver로 sentinel이 보이면 다음 batch fetch
 * - 카드 클릭 시 그 자리에서 인라인 재생 (presigned URL은 클릭 시점에 server action으로 발급)
 * - free 유저도 시청 가능 — 별도 plan 가드 없음
 */
export function RoutineVideoGrid({
  initialItems,
  initialNextOffset,
  pageSize = 20,
}: {
  initialItems: RoutineVideoMeta[];
  initialNextOffset: number | null;
  pageSize?: number;
}) {
  const [items, setItems] = useState<RoutineVideoMeta[]>(initialItems);
  const [nextOffset, setNextOffset] = useState<number | null>(initialNextOffset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || nextOffset == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getRoutineVideosBatch(nextOffset, pageSize);
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.dayNumber));
        const merged = [...prev];
        for (const it of res.items) {
          if (!seen.has(it.dayNumber)) merged.push(it);
        }
        return merged;
      });
      setNextOffset(res.nextOffset);
    } catch {
      setError("영상을 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }, [loading, nextOffset, pageSize]);

  useEffect(() => {
    if (nextOffset == null) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, nextOffset]);

  const handlePlay = useCallback(async (dayNumber: number) => {
    setActiveError(null);
    setActiveDay((prev) => {
      if (prev === dayNumber) {
        setActiveUrl(null);
        return null;
      }
      return dayNumber;
    });
    setActiveUrl(null);
    setActiveLoading(true);
    try {
      const res = await getRoutineVideoSignedUrl(dayNumber);
      if (res.ok) {
        setActiveUrl(res.url);
      } else {
        setActiveError(res.error);
      }
    } catch {
      setActiveError("영상 URL을 가져오지 못했어요");
    } finally {
      setActiveLoading(false);
    }
  }, []);

  if (items.length === 0 && nextOffset == null) {
    return (
      <p className="text-center text-sm text-gs-muted py-8">
        등록된 100일 영상이 아직 없어요.
      </p>
    );
  }

  return (
    <div>
      <ul
        className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="routine-video-grid"
      >
        {items.map((it) => {
          const isActive = activeDay === it.dayNumber;
          return (
            <li key={it.dayNumber}>
              <RoutineVideoCard
                item={it}
                isActive={isActive}
                url={isActive ? activeUrl : null}
                loading={isActive && activeLoading}
                error={isActive ? activeError : null}
                onToggle={() => handlePlay(it.dayNumber)}
              />
            </li>
          );
        })}
      </ul>
      <div
        ref={sentinelRef}
        className="h-12 mt-4 flex items-center justify-center text-xs text-gs-muted"
        aria-live="polite"
      >
        {error ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="text-gs-navy-bright underline"
          >
            다시 시도
          </button>
        ) : loading ? (
          "불러오는 중…"
        ) : nextOffset == null ? (
          items.length > 0 ? "마지막 영상까지 다 봤어요" : null
        ) : null}
      </div>
    </div>
  );
}

function RoutineVideoCard({
  item,
  isActive,
  url,
  loading,
  error,
  onToggle,
}: {
  item: RoutineVideoMeta;
  isActive: boolean;
  url: string | null;
  loading: boolean;
  error: string | null;
  onToggle: () => void;
}) {
  return (
    <div
      className="bg-white rounded-toss-card border border-gs-line-soft shadow-toss-card overflow-hidden flex flex-col"
      data-testid={`routine-video-card-${item.dayNumber}`}
    >
      <div className="relative aspect-video bg-gs-navy-50">
        {isActive && url ? (
          <video
            src={url}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="w-full h-full bg-black"
          />
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="absolute inset-0 flex items-center justify-center hover:bg-gs-navy-50/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40"
            aria-label={`${item.dayNumber}일차 ${item.title} 재생`}
          >
            <span className="absolute top-2 left-2 text-[11px] font-bold bg-white/90 px-2 py-0.5 rounded-full text-gs-text-strong">
              {item.dayNumber}일차
            </span>
            {isActive && loading ? (
              <span className="text-xs text-gs-muted">불러오는 중…</span>
            ) : isActive && error ? (
              <span className="text-xs text-gs-muted px-2 text-center">
                {error}
              </span>
            ) : isActive && !url ? (
              <span className="text-xs text-gs-muted">영상 준비 중</span>
            ) : (
              <span
                aria-hidden
                className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-toss-card text-gs-navy-bright text-xl"
              >
                ▶
              </span>
            )}
          </button>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="text-[13px] font-bold leading-snug line-clamp-2 text-gs-text-strong">
          {item.title}
        </h3>
        {isActive && url ? (
          <button
            type="button"
            onClick={onToggle}
            className="mt-2 self-start text-[11px] text-gs-muted hover:text-gs-navy-bright transition-colors"
          >
            닫기
          </button>
        ) : null}
      </div>
    </div>
  );
}
