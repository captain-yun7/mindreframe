"use client";

import { useCallback, useRef } from "react";

/**
 * R2 직접 호스팅 단일 mp4 플레이어.
 * - presigned URL 30분 만료 → 페이지 로드 시 매번 새로 발급
 * - HLS 아님. 720p 단일 mp4 권장 (모바일 대역폭)
 * - preload="metadata" — 자동 다운로드 줄이고 길이/포스터만 미리 로드
 *
 * F78 — `onProgress70` prop(옵셔널)을 받으면 currentTime/duration ≥ 0.7
 * 도달 시 1회만 호출한다. duration NaN 가드 + 한 번 트리거 후 flag로 보호.
 * 기존 `/study/[slug]/play` 호출처는 prop 미전달이라 무영향.
 */
export function VideoPlayer({
  videoUrl,
  posterUrl,
  autoplay,
  onProgress70,
}: {
  videoUrl: string;
  posterUrl?: string;
  autoplay: boolean;
  onProgress70?: () => void;
}) {
  const triggeredRef = useRef(false);

  const handleTimeUpdate = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      if (!onProgress70 || triggeredRef.current) return;
      const v = e.currentTarget;
      const duration = v.duration;
      if (!duration || Number.isNaN(duration) || duration <= 0) return;
      const progress = v.currentTime / duration;
      if (progress >= 0.7) {
        triggeredRef.current = true;
        onProgress70();
      }
    },
    [onProgress70],
  );

  return (
    <video
      src={videoUrl}
      controls
      poster={posterUrl}
      autoPlay={autoplay}
      playsInline
      preload="metadata"
      onTimeUpdate={onProgress70 ? handleTimeUpdate : undefined}
      className="w-full aspect-video bg-black rounded-[12px]"
    />
  );
}
