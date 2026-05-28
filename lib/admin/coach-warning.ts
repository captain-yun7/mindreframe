import { normalizePlan } from "@/lib/auth/plan";

/**
 * F87 — 플랜 미달 빨간 경고 룰.
 * pro: 주 2회 한도 + 주 시작 5일 경과 + 0회 → 'red'
 * premium: 주 4회 한도 + 주 시작 2일 경과 + 0회 → 'red' (더 엄격)
 * free / light: 표시 안 함
 *
 * NOTE: 'ai' 같은 옛 키나 null이 들어오면 매칭 누락되던 버그가 있어
 * 항상 `normalizePlan`을 거쳐 표준 Plan 키로 정규화 후 비교.
 */
export function getCoachWarningLevel(
  plan: string | null | undefined,
  daysSinceWeekStart: number,
  sessionsThisWeek: number,
): "red" | null {
  const p = normalizePlan(plan);
  if (p === "pro" && daysSinceWeekStart >= 5 && sessionsThisWeek === 0) {
    return "red";
  }
  if (p === "premium" && daysSinceWeekStart >= 2 && sessionsThisWeek === 0) {
    return "red";
  }
  return null;
}

/** 이번 주 월요일 00:00 KST의 ISO 문자열. */
export function mondayStartIsoKst(now: Date = new Date()): string {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const dow = kst.getUTCDay(); // 0=일 ... 6=토
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(kst);
  monday.setUTCDate(monday.getUTCDate() - daysToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  // KST 00:00 == UTC 15:00 of previous day
  return new Date(monday.getTime() - KST_OFFSET_MS).toISOString();
}

/** 주 시작(월요일) 기준 경과 일수 (정수). */
export function daysSinceWeekStartKst(now: Date = new Date()): number {
  const monday = new Date(mondayStartIsoKst(now));
  const elapsed = (now.getTime() - monday.getTime()) / 86_400_000;
  return Math.floor(elapsed);
}
