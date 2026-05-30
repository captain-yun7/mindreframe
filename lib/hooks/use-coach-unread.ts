"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * K7·F154 — 사용자 측 unread count.
 *
 * 본인 세션의 coach 메시지 중 read_at IS NULL 인 개수.
 * Realtime: coach_chat_messages INSERT/UPDATE → refetch (debounce 500ms).
 */
export function useCoachUnreadForUser(userId: string | null): number {
  const [count, setCount] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }
    let cancelled = false;
    let refetchTimer: ReturnType<typeof setTimeout> | null = null;

    async function refetch() {
      const { data, error } = await supabase.rpc(
        "count_unread_coach_messages_for_user",
        { p_user_id: userId },
      );
      if (cancelled) return;
      if (error || data == null) return;
      setCount(Number(data));
    }

    void refetch();

    const channel = supabase
      .channel(`coach-unread-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_chat_messages" },
        () => {
          if (refetchTimer) clearTimeout(refetchTimer);
          refetchTimer = setTimeout(() => void refetch(), 500);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (refetchTimer) clearTimeout(refetchTimer);
      void supabase.removeChannel(channel);
    };
  }, [userId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return count;
}

/**
 * K7·F154 — 어드민 측 unread count (전체 사용자 합).
 *
 * 어드민 헤더 "/admin" 옆에 빨간 점/숫자 표시용.
 */
export function useCoachUnreadForAdmin(enabled: boolean): number {
  const [count, setCount] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    let cancelled = false;
    let refetchTimer: ReturnType<typeof setTimeout> | null = null;

    async function refetch() {
      const { data, error } = await supabase.rpc(
        "count_unread_user_messages_for_admin",
      );
      if (cancelled) return;
      if (error || !Array.isArray(data)) return;
      const total = data.reduce(
        (s: number, row: { unread_count: number }) => s + Number(row.unread_count ?? 0),
        0,
      );
      setCount(total);
    }

    void refetch();

    const channel = supabase
      .channel("coach-unread-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_chat_messages" },
        () => {
          if (refetchTimer) clearTimeout(refetchTimer);
          refetchTimer = setTimeout(() => void refetch(), 500);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (refetchTimer) clearTimeout(refetchTimer);
      void supabase.removeChannel(channel);
    };
  }, [enabled]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return count;
}
