/**
 * KST(Asia/Seoul) 기준 날짜 유틸.
 * 서버가 UTC라도 한국 자정에 날짜가 넘어가도록 함.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 기준 오늘 날짜 (YYYY-MM-DD). */
export function todayKst(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** KST 기준 ISO 주차. */
export function isoWeekKst(): number {
  const now = new Date(Date.now() + KST_OFFSET_MS);
  return Math.ceil(
    ((now.getTime() - new Date(now.getUTCFullYear(), 0, 1).getTime()) /
      86_400_000 +
      new Date(now.getUTCFullYear(), 0, 1).getDay() +
      1) /
      7,
  );
}

/**
 * K1·F211 — KST 기준 날짜·시간 포맷 helper.
 * 서버가 UTC라도 사용자에게는 항상 KST(Asia/Seoul)로 보여야 한다.
 */

const KST_LOCALE = "ko-KR";
const KST_TZ = "Asia/Seoul";

/** "2026-05-30" 같은 짧은 날짜. */
export function formatDateKst(input: Date | string | number): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  // sv-SE 로케일은 YYYY-MM-DD 포맷을 보장
  return d.toLocaleDateString("sv-SE", { timeZone: KST_TZ });
}

/** "2026. 5. 30." 같은 한국어 짧은 날짜. */
export function formatDateKoKst(input: Date | string | number): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(KST_LOCALE, { timeZone: KST_TZ });
}

/** "오후 4:32" 같은 KST 시간. */
export function formatTimeKst(input: Date | string | number): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(KST_LOCALE, {
    timeZone: KST_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "2026. 5. 30. 오후 4:32" — 전체 표시용. */
export function formatDateTimeKst(input: Date | string | number): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(KST_LOCALE, {
    timeZone: KST_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * 일자 배열로 오늘부터 거꾸로 연속 스트릭 카운트.
 * dates는 'YYYY-MM-DD' 문자열 Set. KST 기준 오늘부터 하루씩 거슬러 올라가 매칭.
 */
export function calcStreak(dates: Set<string>): number {
  let streak = 0;
  const cursor = new Date(Date.now() + KST_OFFSET_MS);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dates.has(key)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
