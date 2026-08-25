import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeDayNumber } from "@/lib/coach/day-number";

/**
 * 사용자의 100일 차수 기준일 조회 (2026-08-25 고객 결정: 결제일 기준).
 * 우선순위: plan_started_at(결제/쿠폰 등록일) → notifications_started_at → created_at
 * plan_started_at 컬럼 미적용(마이그레이션 전) 환경에서는 기존 기준으로 fallback.
 */
export async function getUserDayNumber(
  supabase: SupabaseClient,
  userId: string,
  createdAtFallback?: string | null,
): Promise<number> {
  let planStartedAt: string | null = null;
  let notifStartedAt: string | null = null;
  let createdAt: string | null = createdAtFallback ?? null;

  const res = await supabase
    .from("users")
    .select("plan_started_at, notifications_started_at, created_at")
    .eq("id", userId)
    .single();
  if (
    res.error &&
    (res.error.code === "42703" || /plan_started_at/.test(res.error.message))
  ) {
    const r2 = await supabase
      .from("users")
      .select("notifications_started_at, created_at")
      .eq("id", userId)
      .single();
    const d2 = r2.data as { notifications_started_at?: string | null; created_at?: string | null } | null;
    notifStartedAt = d2?.notifications_started_at ?? null;
    createdAt = d2?.created_at ?? createdAt;
  } else {
    const d = res.data as {
      plan_started_at?: string | null;
      notifications_started_at?: string | null;
      created_at?: string | null;
    } | null;
    planStartedAt = d?.plan_started_at ?? null;
    notifStartedAt = d?.notifications_started_at ?? null;
    createdAt = d?.created_at ?? createdAt;
  }

  return (
    computeDayNumber(planStartedAt) ??
    computeDayNumber(notifStartedAt) ??
    computeDayNumber(createdAt) ??
    1
  );
}
