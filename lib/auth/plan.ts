/**
 * 플랜 정의 + 페이지/기능별 권한 매트릭스.
 *
 * 요구사항 (`/pricing` 명세):
 *   free      미결제 (체험)
 *   light     라이트 (254,000원/100일) — 가짜생각 분석기 5회/일, 주 1회 1:1 코칭, 쓰레기통/루틴/알고가기/성장방
 *   pro       프로 (394,000원/100일)   — 라이트 전체 + 가짜생각 분석기 7회/일 + 주 2회 1:1 코칭 + 행동연습장 + 명상
 *   premium   프리미엄 (694,000원/100일) — 프로 전체 + 가짜생각 분석기 무제한/일 + 주 4회 1:1 코칭 + 우선 지원
 */

export type Plan = "free" | "light" | "pro" | "premium";

const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  light: 1,
  pro: 2,
  premium: 3,
};

/**
 * 플랜별 기능 한도 (일일).
 * - analyzer:   가짜생각 분석기 finalize 완료 횟수 (= chat_analyses alternative_thought 업데이트 시점)
 * - trash:      생각쓰레기통 JSON 추출 + thought_records INSERT 완료 횟수
 * - exercise:   행동연습장 4단계 완료(logExercise) 횟수
 * - meditation: 명상 트랙 재생 완료(logMeditation) 횟수
 *
 * 명세 (F99 / 4차 피드백):
 *   free     0 / 0 / 0 / 0          (모두 차단)
 *   light    5 / 5 / 5 / 5
 *   pro      7 / 7 / 0 / 0          (행동연습장·명상 명시적 차단)
 *   premium  무제한                  (UNLIMITED sentinel)
 *
 * NOTE: 단순 위계(`planAtLeast`)로는 "light OK / pro ❌ / premium OK"를 표현하지 못하므로
 * 페이지/server action 단에서 `canAccessFeature` + `PLAN_FEATURE_LIMITS`를 직접 사용해야 함.
 */
export type UsageFeature = "analyzer" | "trash" | "exercise" | "meditation";

/** 한도 미상한 sentinel — 모든 비교 코드(`used >= limit`)에서 통과되어야 함. */
export const UNLIMITED = Number.MAX_SAFE_INTEGER;

export const PLAN_FEATURE_LIMITS: Record<Plan, Record<UsageFeature, number>> = {
  free: { analyzer: 0, trash: 0, exercise: 0, meditation: 0 },
  light: { analyzer: 5, trash: 5, exercise: 5, meditation: 5 },
  pro: { analyzer: 7, trash: 7, exercise: 0, meditation: 0 },
  premium: {
    analyzer: UNLIMITED,
    trash: UNLIMITED,
    exercise: UNLIMITED,
    meditation: UNLIMITED,
  },
};

export function getPlanFeatureLimit(plan: Plan, feature: UsageFeature): number {
  return PLAN_FEATURE_LIMITS[plan][feature];
}

/**
 * 플랜 × 기능 접근 매트릭스.
 *
 * `analyzer/trash/exercise/meditation`은 `PLAN_FEATURE_LIMITS > 0` 와 동치지만
 * `coach`는 한도 함수가 별도(`getCoachWeeklyLimit`)이므로 매트릭스로 통합.
 *
 * 페이지 server component / server action 진입 가드에서 사용.
 */
export type FeatureKey = "analyzer" | "trash" | "exercise" | "meditation" | "coach";

export const PLAN_FEATURE_ACCESS: Record<Plan, Record<FeatureKey, boolean>> = {
  free: { analyzer: false, trash: false, exercise: false, meditation: false, coach: false },
  light: { analyzer: true, trash: true, exercise: true, meditation: true, coach: true },
  pro: { analyzer: true, trash: true, exercise: false, meditation: false, coach: true },
  premium: { analyzer: true, trash: true, exercise: true, meditation: true, coach: true },
};

/** 페이지/server action 가드. 'ai' 같은 옛 키나 null도 안전 처리. */
export function canAccessFeature(
  plan: Plan | string | null | undefined,
  feature: FeatureKey,
): boolean {
  const p = normalizePlan(plan as string | null | undefined);
  return PLAN_FEATURE_ACCESS[p][feature];
}

/** DB에 저장된 raw 값을 표준 Plan 키로 정규화. */
export function normalizePlan(raw: string | null | undefined): Plan {
  switch (raw) {
    case "light":
    case "ai": // 과거 명칭
      return "light";
    case "pro":
      return "pro";
    case "premium":
      return "premium";
    default:
      return "free";
  }
}

export function planAtLeast(current: Plan, required: Plan): boolean {
  return PLAN_RANK[current] >= PLAN_RANK[required];
}

/**
 * 라우트 prefix별 최소 요구 plan — middleware 1차 가드.
 * 정의되지 않은 prefix는 free 허용 (또는 인증만 통과하면 됨).
 *
 * NOTE: 단순 위계 모델로는 "light OK / pro ❌ / premium OK" (행동연습장·명상)를
 * 표현할 수 없음. middleware는 light 통과시키는 1차 가드만 담당하고, 정확한
 * "프로 차단" 분기는 페이지 server component의 `canAccessFeature`로 처리.
 */
export const ROUTE_PLAN_REQUIREMENT: Array<{ prefix: string; required: Plan }> = [
  // 모두 라이트 이상 — 프로 차단(행동연습장/명상)은 페이지에서 처리.
  { prefix: "/dashboard", required: "light" },
  { prefix: "/trash", required: "light" },
  { prefix: "/chat", required: "light" },
  { prefix: "/progress", required: "light" },
  { prefix: "/exercise", required: "light" },
  { prefix: "/meditation", required: "light" },
  { prefix: "/coach", required: "light" },
];

/** 플랜별 주간 코치 채팅 세션 한도. 라이트=1, 프로=2, 프리미엄=4. */
export function getCoachWeeklyLimit(plan: Plan): number {
  if (plan === "premium") return 4;
  if (plan === "pro") return 2;
  if (plan === "light") return 1;
  return 0;
}

export function getRoutePlanRequirement(pathname: string): Plan | null {
  for (const rule of ROUTE_PLAN_REQUIREMENT) {
    if (pathname.startsWith(rule.prefix)) return rule.required;
  }
  return null;
}

export function isPlanGateEnabled(): boolean {
  return process.env.PLAN_GATE_ENABLED === "true";
}

/**
 * 설문 점수(우울 0~27, 불안 0~21) 기반 추천 플랜 계산.
 * 백분율 환산 후 합산하여 라이트/프로/프리미엄 분기.
 * `/survey`와 `/pricing` 양쪽에서 동일하게 사용해야 일관성 유지.
 */
export function computeRecommendedPlan(
  depressionScore: number,
  anxietyScore: number,
): Plan {
  const depPercent = Math.round((depressionScore / 27) * 100);
  const anxPercent = Math.round((anxietyScore / 21) * 100);
  const total = depPercent + anxPercent;
  if (total > 140) return "premium";
  if (total > 100) return "pro";
  return "light";
}
