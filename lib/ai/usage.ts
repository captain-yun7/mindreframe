/**
 * AI 사용량 차감 헬퍼.
 *
 * `ai_usage` 테이블 기준: (user_id, used_at) UNIQUE — 일자별 한 행.
 * 매 호출마다 count += 1 upsert.
 *
 * 한도 (요구사항 /pricing 명세 매칭):
 *   free     0회/일 (체험 불가, 결제 유도)
 *   light    1회/일 (라이트 AI)
 *   pro      2회/일 (프로)
 *   premium  4회/일 (프리미엄)
 *
 * 베타 기간 검증을 위해 ENV `AI_USAGE_LIMITS_DISABLED=true` 면 모든 검사 우회.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePlan, type Plan } from "@/lib/auth/plan";

export type { Plan };

export const PLAN_DAILY_LIMIT: Record<Plan, number> = {
  free: 0,
  light: 1,
  pro: 2,
  premium: 4,
};

function todayDateString(): string {
  // YYYY-MM-DD (UTC). DB의 used_at도 date 타입.
  return new Date().toISOString().slice(0, 10);
}

export interface UsageCheckResult {
  ok: boolean;
  used: number;
  limit: number;
  plan: Plan;
  reason?: string;
}

export async function checkAndIncrementUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<UsageCheckResult> {
  if (process.env.AI_USAGE_LIMITS_DISABLED === "true") {
    return { ok: true, used: 0, limit: Number.MAX_SAFE_INTEGER, plan: "free" };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = normalizePlan(profile?.plan as string | null | undefined);
  const limit = PLAN_DAILY_LIMIT[plan];

  const today = todayDateString();

  const { data: existing } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("used_at", today)
    .maybeSingle();

  const used = existing?.count ?? 0;

  if (used >= limit) {
    return {
      ok: false,
      used,
      limit,
      plan,
      reason:
        limit === 0
          ? "AI 분석은 유료 플랜(라이트/프로/프리미엄)부터 이용 가능합니다."
          : `오늘의 AI 분석 한도(${limit}회)를 모두 사용하셨습니다. 내일 다시 이용해주세요.`,
    };
  }

  const newCount = used + 1;
  const { error } = await supabase
    .from("ai_usage")
    .upsert(
      { user_id: userId, used_at: today, count: newCount },
      { onConflict: "user_id,used_at" },
    );

  if (error) {
    console.warn("[ai/usage] upsert failed:", error.message);
    return { ok: true, used, limit, plan };
  }

  return { ok: true, used: newCount, limit, plan };
}
