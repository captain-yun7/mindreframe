"use client";

import { useEffect, useRef } from "react";

type HlsCtor = {
  new (): {
    loadSource(url: string): void;
    attachMedia(el: HTMLVideoElement): void;
    destroy(): void;
  };
  isSupported(): boolean;
};

/**
 * Cloudflare Stream HLS 플레이어.
 * - Safari (iOS/macOS) — native HLS 지원
 * - 기타 브라우저 — hls.js 동적 import 시도, 실패 시 native src fallback
 */
export function VideoPlayer({
  hlsUrl,
  posterUrl,
  autoplay,
}: {
  hlsUrl: string;
  posterUrl: string;
  autoplay: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      return;
    }

    let destroyed = false;
    let hlsInstance: { destroy: () => void } | null = null;

    (async () => {
      try {
        // hls.js는 선택적 의존성 — 미설치 시 native fallback
        const mod = await import(
          /* @vite-ignore */ /* webpackIgnore: true */ "hls.js" as string
        ).catch(() => null);
        if (!mod || destroyed) {
          video.src = hlsUrl;
          return;
        }
        const Hls = (mod as { default: HlsCtor }).default;
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          hlsInstance = hls;
        } else {
          video.src = hlsUrl;
        }
      } catch {
        if (!destroyed) video.src = hlsUrl;
      }
    })();

    return () => {
      destroyed = true;
      if (hlsInstance) hlsInstance.destroy();
    };
  }, [hlsUrl]);

  return (
    <video
      ref={videoRef}
      controls
      poster={posterUrl}
      autoPlay={autoplay}
      playsInline
      className="w-full aspect-video bg-black rounded-[12px]"
    />
  );
}
