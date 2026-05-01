/**
 * 플랜 정의 + 페이지/기능별 권한 매트릭스.
 *
 * 요구사항 (`/pricing` 명세):
 *   free      체험 (베타 기간 무료, 정식 출시 후엔 결제 유도)
 *   light     라이트 AI (254,000원/100일) — 분석 1회/일, 분석기/쓰레기통/루틴/알고가기/성장방
 *   pro       프로 (394,000원/100일)     — 라이트 + 행동연습장 + 명상하기 + 1:1 코칭 주2회
 *   premium   프리미엄 (694,000원/100일) — 프로 + 전담 상담사 + 우선 지원
 *
 * 베타 기간엔 `PLAN_GATE_ENABLED=false`로 두고 모두 허용.
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
  // 프로 이상 (행동연습장 + 명상)
  { prefix: "/exercise", required: "pro" },
  { prefix: "/meditation", required: "pro" },
];

export function getRoutePlanRequirement(pathname: string): Plan | null {
  for (const rule of ROUTE_PLAN_REQUIREMENT) {
    if (pathname.startsWith(rule.prefix)) return rule.required;
  }
  return null;
}

export function isPlanGateEnabled(): boolean {
  return process.env.PLAN_GATE_ENABLED === "true";
}
