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
