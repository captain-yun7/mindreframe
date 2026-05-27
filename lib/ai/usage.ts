/**
 * AI 사용량 차감 헬퍼 (H2 리팩).
 *
 * `ai_usage` 테이블 기준: (user_id, used_at, feature) UNIQUE — 일자별·기능별 한 행.
 *
 * 한도 (lib/auth/plan.ts::PLAN_FEATURE_LIMITS 참조):
 *   free     0 / 0
 *   light    5 / 5
 *   pro      7 / 7
 *   premium  무제한
 *
 * 카운팅 단위 변경 (H2):
 *   - 분석기: finalizeAndSave 완료 시 1회
 *   - 쓰레기통: JSON 추출 + thought_records INSERT 성공 시 1회
 *
 *   → 사전 체크는 `checkUsageOnly(feature)`로 (카운팅 X)
 *   → 카운팅은 `incrementUsage(feature)`로 분리
 *
 * 베타 기간 검증을 위해 ENV `AI_USAGE_LIMITS_DISABLED=true` 면 모든 검사 우회.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizePlan,
  PLAN_FEATURE_LIMITS,
  type Plan,
  type UsageFeature,
} from "@/lib/auth/plan";

export type { Plan, UsageFeature };

/**
 * @deprecated H2에서 PLAN_FEATURE_LIMITS로 대체. 기존 호환 위해 유지.
 */
export const PLAN_DAILY_LIMIT: Record<Plan, number> = {
  free: 0,
  light: 5,
  pro: 7,
  premium: Number.MAX_SAFE_INTEGER,
};

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface UsageCheckResult {
  ok: boolean;
  used: number;
  limit: number;
  plan: Plan;
  reason?: string;
}

async function loadUserPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<Plan> {
  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();
  return normalizePlan(profile?.plan as string | null | undefined);
}

function featureLabel(feature: UsageFeature): string {
  return feature === "analyzer" ? "가짜생각 분석기" : "생각쓰레기통";
}

/**
 * 사전 한도 체크 — 카운트 증가 없이 현재 사용량과 한도만 확인.
 * 분석 흐름 진입 시 호출. 한도 초과면 ok:false.
 */
export async function checkUsageOnly(
  supabase: SupabaseClient,
  userId: string,
  feature: UsageFeature,
): Promise<UsageCheckResult> {
  if (process.env.AI_USAGE_LIMITS_DISABLED === "true") {
    return { ok: true, used: 0, limit: Number.MAX_SAFE_INTEGER, plan: "free" };
  }

  const plan = await loadUserPlan(supabase, userId);
  const limit = PLAN_FEATURE_LIMITS[plan][feature];
  const today = todayDateString();

  const { data: existing } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("used_at", today)
    .eq("feature", feature)
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
          ? `${featureLabel(feature)}는 유료 플랜(라이트/프로/프리미엄)부터 이용 가능합니다.`
          : `오늘의 ${featureLabel(feature)} 한도(${limit}회)를 모두 사용하셨습니다. 내일 다시 이용해주세요.`,
    };
  }

  return { ok: true, used, limit, plan };
}

/**
 * 카운트 증가 — 분석/추출 성공 시점에만 호출.
 * 한도 검사 없이 무조건 +1 (호출 전에 checkUsageOnly로 검증 권장).
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: UsageFeature,
): Promise<UsageCheckResult> {
  if (process.env.AI_USAGE_LIMITS_DISABLED === "true") {
    return { ok: true, used: 0, limit: Number.MAX_SAFE_INTEGER, plan: "free" };
  }

  const plan = await loadUserPlan(supabase, userId);
  const limit = PLAN_FEATURE_LIMITS[plan][feature];
  const today = todayDateString();

  const { data: existing } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("used_at", today)
    .eq("feature", feature)
    .maybeSingle();

  const used = existing?.count ?? 0;
  const newCount = used + 1;

  const { error } = await supabase
    .from("ai_usage")
    .upsert(
      { user_id: userId, used_at: today, feature, count: newCount },
      { onConflict: "user_id,used_at,feature" },
    );

  if (error) {
    console.warn("[ai/usage] upsert failed:", error.message);
    return { ok: true, used, limit, plan };
  }

  return { ok: true, used: newCount, limit, plan };
}

/**
 * @deprecated H2 이전 시그니처. checkUsageOnly + incrementUsage 분리 사용 권장.
 *
 * 이 함수는 분석기/쓰레기통 카운팅 단위를 잘못 적용하던 시기의 잔재.
 * 신규 코드에서는 사용하지 말 것 — 호환을 위해 analyzer feature로 위임.
 */
export async function checkAndIncrementUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: UsageFeature = "analyzer",
): Promise<UsageCheckResult> {
  const pre = await checkUsageOnly(supabase, userId, feature);
  if (!pre.ok) return pre;
  return incrementUsage(supabase, userId, feature);
}
