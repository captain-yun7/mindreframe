/**
 * AI 사용량 차감 헬퍼.
 *
 * `ai_usage` 테이블 기준: (user_id, used_at) UNIQUE — 일자별 한 행.
 * 매 호출마다 count += 1 upsert.
 *
 * 한도(audit P2-A 가이드 기반):
 *   free     0회/일 (단, 베타 기간 검증 위해 ENV로 끌 수 있음)
 *   ai       1회/일
 *   pro      2회/일
 *   premium  4회/일
 *
 * 실제 운영 정책은 비즈니스 결정 사항. 환경변수 AI_USAGE_LIMITS_DISABLED=true 면
 * 모든 검사를 우회한다 (e2e/시연 모드).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type Plan = "free" | "ai" | "pro" | "premium";

export const PLAN_DAILY_LIMIT: Record<Plan, number> = {
  free: 3, // 베타: 0이 아니라 체험 가능하게 3회. 운영 결정 후 조정.
  ai: 10,
  pro: 30,
  premium: 100,
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

  // 플랜 조회
  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan: Plan = ((profile?.plan as Plan) ?? "free") as Plan;
  const limit = PLAN_DAILY_LIMIT[plan] ?? PLAN_DAILY_LIMIT.free;

  const today = todayDateString();

  // 오늘 사용량 조회
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
      reason: `오늘의 AI 분석 한도(${limit}회)를 모두 사용하셨습니다. 내일 다시 이용해주세요.`,
    };
  }

  // upsert (count += 1)
  const newCount = used + 1;
  const { error } = await supabase
    .from("ai_usage")
    .upsert(
      { user_id: userId, used_at: today, count: newCount },
      { onConflict: "user_id,used_at" },
    );

  if (error) {
    // 차감 실패 시 통과 (사용자에게 페널티 X) — 단 로깅
    console.warn("[ai/usage] upsert failed:", error.message);
    return { ok: true, used, limit, plan };
  }

  return { ok: true, used: newCount, limit, plan };
}
