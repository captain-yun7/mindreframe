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
 * 라우트 prefix별 최소 요구 plan.
 * 정의되지 않은 prefix는 free 허용 (또는 인증만 통과하면 됨).
 */
export const ROUTE_PLAN_REQUIREMENT: Array<{ prefix: string; required: Plan }> = [
  // 라이트 이상
  { prefix: "/dashboard", required: "light" },
  { prefix: "/trash", required: "light" },
  { prefix: "/chat", required: "light" },
  { prefix: "/progress", required: "light" },
  // 프로 이상 (행동연습장 + 명상 + 1:1 코칭)
  { prefix: "/exercise", required: "pro" },
  { prefix: "/meditation", required: "pro" },
  { prefix: "/coach", required: "pro" },
];

/** 플랜별 주간 코치 채팅 세션 한도. 프로=2, 프리미엄=4, 그 외=0. */
export function getCoachWeeklyLimit(plan: Plan): number {
  if (plan === "premium") return 4;
  if (plan === "pro") return 2;
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
