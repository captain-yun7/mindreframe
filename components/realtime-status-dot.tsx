"use client";

import type { RealtimeStatus } from "@/lib/hooks/use-coach-messages-realtime";

/**
 * Realtime 채널 상태를 작은 색깔 점으로 표시.
 *  - connected: 녹색
 *  - connecting / idle: 노란색
 *  - disconnected: 빨간색 (펄스)
 *
 * 헤더 우측에 미니멀하게 노출. title hover 시 상세 텍스트.
 */
export function RealtimeStatusDot({ status }: { status: RealtimeStatus }) {
  const label: Record<RealtimeStatus, string> = {
    idle: "대기 중",
    connecting: "실시간 연결 중…",
    connected: "실시간 연결됨",
    disconnected: "연결 끊김 — 새로고침이 필요할 수 있어요",
  };
  const color: Record<RealtimeStatus, string> = {
    idle: "bg-gs-muted/50",
    connecting: "bg-yellow-400",
    connected: "bg-green-500",
    disconnected: "bg-red-500 animate-pulse",
  };
  return (
    <span
      title={label[status]}
      aria-label={label[status]}
      className={`inline-block w-2 h-2 rounded-full ${color[status]}`}
    />
  );
}
