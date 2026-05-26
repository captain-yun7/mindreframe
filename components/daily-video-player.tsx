"use client";

import { useRef } from "react";
import { VideoPlayer } from "@/app/(public)/study/[slug]/play/video-player";
import { logDailyVideoWatch } from "@/lib/actions/daily-video";

/**
 * F78 — `/study/today/play`에서 사용하는 wrapper.
 * VideoPlayer의 70% 도달 콜백을 server action으로 연결한다.
 *
 * 동시성/재시도 보호:
 *   - `pendingRef`  : in-flight 호출 1회만 — 중복 호출 차단(0.25s 간격 timeupdate가 다수 발생)
 *   - `successRef`  : 한 번 성공하면 더 이상 호출하지 않음(routine_checks UNIQUE로도 막히지만 네트워크 비용 절감)
 *   - 실패 시 `pendingRef`만 풀어 다음 timeupdate에서 자동 재시도(인증 만료/네트워크 일시 오류 등)
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
  const successRef = useRef(false);

  return (
    <VideoPlayer
      videoUrl={videoUrl}
      autoplay={autoplay}
      onProgress70={() => {
        if (successRef.current || pendingRef.current) return;
        pendingRef.current = true;
        logDailyVideoWatch(dayNumber)
          .then((r) => {
            if (r.ok) {
              successRef.current = true;
            } else {
              console.warn("[daily-video] logWatch failed:", r.error);
            }
          })
          .catch((e) => {
            console.error("[daily-video] logWatch threw:", e);
          })
          .finally(() => {
            pendingRef.current = false;
          });
      }}
    />
  );
}
