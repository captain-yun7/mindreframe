"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * J5 / F154 — 코치 채팅 typing indicator (Supabase Realtime broadcast).
 *
 * 사용처:
 *  - 사용자 페이지: useTyping(sessionId, "user")
 *  - 어드민 페이지: useTyping(sessionId, "coach")
 *
 * 반환:
 *  - `notifyTyping()` — input onChange 등에서 호출 (1.5s throttle)
 *  - `othersTyping` — 상대방이 입력 중인지 (마지막 typing 이벤트 후 3초간 true)
 *
 * 구현 노트:
 *  - 같은 채널 이름(`typing-${sessionId}`)으로 양쪽이 연결
 *  - 자기 role은 무시 (echo)
 *  - sessionId가 null/빈 string이면 idle (네트워크 사용 없음)
 */

export type TypingRole = "user" | "coach";

const SEND_THROTTLE_MS = 1500;
const HIDE_AFTER_MS = 3000;

export function useTypingIndicator(
  sessionId: string | null | undefined,
  selfRole: TypingRole,
) {
  const [othersTyping, setOthersTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSentAtRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase.channel(`typing-${sessionId}`, {
      config: { broadcast: { self: false } },
    });

    ch.on("broadcast", { event: "typing" }, (payload) => {
      const role = (payload?.payload as { role?: string } | undefined)?.role;
      if (role === selfRole) return; // 자기 자신 이벤트 무시
      if (role !== "user" && role !== "coach") return;
      setOthersTyping(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setOthersTyping(false);
      }, HIDE_AFTER_MS);
    });

    ch.subscribe();
    channelRef.current = ch;

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      void supabase.removeChannel(ch);
      channelRef.current = null;
      // 채널 해제 시 stale 표시 방지
      setOthersTyping(false);
    };
  }, [sessionId, selfRole]);

  const notifyTyping = useCallback(() => {
    if (!sessionId) return;
    const now = Date.now();
    if (now - lastSentAtRef.current < SEND_THROTTLE_MS) return;
    lastSentAtRef.current = now;
    const ch = channelRef.current;
    if (!ch) return;
    void ch.send({
      type: "broadcast",
      event: "typing",
      payload: { role: selfRole },
    });
  }, [sessionId, selfRole]);

  return { othersTyping, notifyTyping };
}
