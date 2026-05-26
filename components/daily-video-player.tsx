"use client";

import { useRef } from "react";
import { VideoPlayer } from "@/app/(public)/study/[slug]/play/video-player";
import { logDailyVideoWatch } from "@/lib/actions/daily-video";

/**
 * F78 — `/study/today/play`에서 사용하는 wrapper.
 * VideoPlayer의 70% 도달 콜백을 server action으로 연결한다.
 *
 * - 재시도 보호: server action 실패 시 flag를 풀어 다음 timeupdate에서 재시도.
 * - 정상 시 라우터 새로고침 없이 routine_checks 1행만 INSERT (revalidatePath는 server에서).
 */
export function DailyVideoPlayer({
  videoUrl,
  dayNumber,
  autoplay,
}: {
  videoUrl: string;
  dayNumber: number;
  autoplay: boolean;
}) {
  const pendingRef = useRef(false);

  return (
    <VideoPlayer
      videoUrl={videoUrl}
      autoplay={autoplay}
      onProgress70={() => {
        if (pendingRef.current) return;
        pendingRef.current = true;
        logDailyVideoWatch(dayNumber)
          .then((r) => {
            if (!r.ok) {
              // 실패 시 재시도 허용 (다음 timeupdate에서 다시 트리거되도록 flag 해제)
              pendingRef.current = false;
              console.warn("[daily-video] logWatch failed:", r.error);
            }
          })
          .catch((e) => {
            pendingRef.current = false;
            console.error("[daily-video] logWatch threw:", e);
          });
      }}
    />
  );
}
