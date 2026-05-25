"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CoachMessage } from "@/lib/actions/coach-chat";

/**
 * Realtime 채널 연결 상태.
 *  - idle: 구독 시작 전 (activeSession 없음)
 *  - connecting: subscribe 호출 직후, 첫 status 콜백 전
 *  - connected: 'SUBSCRIBED'
 *  - disconnected: 'CHANNEL_ERROR' / 'TIMED_OUT' / 'CLOSED'
 */
export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected";

/**
 * Realtime INSERT 구독 + 옵티미스틱 dedup hook.
 *
 * dedup 규칙:
 *  1) 이미 실 ID로 들어와 있으면 skip
 *  2) tmp-* 옵티미스틱 메시지와 sender_role + content + 1.5s 윈도우 매칭 → 교체
 *  3) 그 외는 append
 *
 * 활성 세션만 구독한다 — 종료된 세션은 새 메시지가 생기지 않음.
 *
 * status: 연결 상태(UI 인디케이터용). 끊김 감지 시 자동 재구독은 Supabase 라이브러리
 * 내장 재시도에 위임하고, 우리는 UX 안내(상단 점)와 새로고침 권유만 제공.
 */
export function useCoachMessagesRealtime(
  initial: CoachMessage[],
  sessionIds: string[],
) {
  const [messages, setMessages] = useState<CoachMessage[]>(initial);
  const [status, setStatus] = useState<RealtimeStatus>("idle");

  // initial이 부모에서 prop 갱신될 때만 동기화 (string key로 안정성 확보)
  const initialKey = JSON.stringify(initial.map((m) => m.id));
  const lastInitialKey = useRef(initialKey);
  useEffect(() => {
    if (lastInitialKey.current !== initialKey) {
      lastInitialKey.current = initialKey;
      setMessages(initial);
    }
  }, [initialKey, initial]);

  const append = useCallback((m: CoachMessage) => {
    setMessages((prev) => {
      // 1) 이미 실 ID 존재 → skip
      if (prev.some((p) => p.id === m.id)) return prev;
      // 2) 옵티미스틱(tmp-*) + sender+content + 1.5s 윈도우 매칭 → 교체
      const idx = prev.findIndex(
        (p) =>
          p.id.startsWith("tmp-") &&
          p.sender_role === m.sender_role &&
          p.content === m.content &&
          Math.abs(
            new Date(p.created_at).getTime() - new Date(m.created_at).getTime(),
          ) < 1500,
      );
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = m;
        return next;
      }
      // 3) 일반 append
      return [...prev, m];
    });
  }, []);

  // 구독 key는 sessionIds.join("|")로 안정화
  const sessionsKey = sessionIds.join("|");

  useEffect(() => {
    if (sessionIds.length === 0) {
      setStatus("idle");
      return;
    }

    setStatus("connecting");
    const channel = supabase.channel(`coach-${sessionsKey}`);

    for (const sid of sessionIds) {
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "coach_chat_messages",
          filter: `session_id=eq.${sid}`,
        },
        (payload) => {
          const m = payload.new as CoachMessage;
          // session_id 보강 (payload.new가 일부 필드 누락된 경우 대비)
          append({ ...m, session_id: m.session_id ?? sid });
        },
      );
    }

    // status 콜백 — Supabase 라이브러리가 SUBSCRIBED/CHANNEL_ERROR/TIMED_OUT/CLOSED 전달
    channel.subscribe((s) => {
      if (s === "SUBSCRIBED") setStatus("connected");
      else if (
        s === "CHANNEL_ERROR" ||
        s === "TIMED_OUT" ||
        s === "CLOSED"
      ) {
        setStatus("disconnected");
      }
    });
    return () => {
      void supabase.removeChannel(channel);
    };
    // sessionsKey 변화 시 재구독. append는 useCallback이라 안정적.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsKey, append]);

  return { messages, setMessages, append, status };
}
