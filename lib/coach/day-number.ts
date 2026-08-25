import { KST_OFFSET_MS } from "@/lib/dates";

/**
 * 100일 차수 계산 — KST "날짜" 기준.
 * 시작 날짜(KST) = 1일차, 다음 날 = 2일차. (시각과 무관하게 자정에 일차가 바뀜)
 *
 * 기존 구현은 시작 "시각"으로부터 rolling 24h 단위로 계산해서
 * 같은 날에도 오후에 일차가 바뀌는 문제가 있었음 (2026-08-25 고객 리포트).
 *
 * 입력: date-only 문자열("2026-08-17") 또는 timestamp — 모두 KST 날짜로 정규화.
 * 미시작 → null. 100 초과는 100으로 clamp.
 */
export function computeDayNumber(
  startedAt: string | null | undefined,
): number | null {
  const startDate = toKstDateUtcMs(startedAt);
  if (startDate === null) return null;
  const todayDate = toKstDateUtcMs(new Date().toISOString());
  if (todayDate === null) return null;
  const day = Math.floor((todayDate - startDate) / 86_400_000) + 1;
  if (day < 1) return 1;
  if (day > 100) return 100;
  return day;
}

/** KST 기준 날짜(자정)의 UTC ms. date-only 문자열은 그대로 그 날짜로 해석. */
function toKstDateUtcMs(value: string | null | undefined): number | null {
  if (!value) return null;
  // date-only ("YYYY-MM-DD") → 그 날짜 자체
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const t = Date.parse(value + "T00:00:00Z");
    return Number.isNaN(t) ? null : t;
  }
  const t = new Date(value);
  if (Number.isNaN(t.getTime())) return null;
  const kstDateStr = new Date(t.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
  return Date.parse(kstDateStr + "T00:00:00Z");
}
