/**
 * 100일 차수 계산. notifications_started_at 시점으로부터 경과한 일수+1.
 * 미시작 → null. 100을 넘어가면 100으로 clamp.
 */
export function computeDayNumber(
  notificationsStartedAt: string | null | undefined,
): number | null {
  if (!notificationsStartedAt) return null;
  const start = new Date(notificationsStartedAt);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  const elapsedMs = now.getTime() - start.getTime();
  if (elapsedMs < 0) return 1;
  const day = Math.floor(elapsedMs / 86_400_000) + 1;
  if (day < 1) return 1;
  if (day > 100) return 100;
  return day;
}
