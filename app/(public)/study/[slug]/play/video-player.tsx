"use client";

/**
 * R2 직접 호스팅 단일 mp4 플레이어.
 * - presigned URL 30분 만료 → 페이지 로드 시 매번 새로 발급
 * - HLS 아님. 720p 단일 mp4 권장 (모바일 대역폭)
 * - preload="metadata" — 자동 다운로드 줄이고 길이/포스터만 미리 로드
 */
export function VideoPlayer({
  videoUrl,
  posterUrl,
  autoplay,
}: {
  videoUrl: string;
  posterUrl?: string;
  autoplay: boolean;
}) {
  return (
    <video
      src={videoUrl}
      controls
      poster={posterUrl}
      autoPlay={autoplay}
      playsInline
      preload="metadata"
      className="w-full aspect-video bg-black rounded-[12px]"
    />
  );
}
