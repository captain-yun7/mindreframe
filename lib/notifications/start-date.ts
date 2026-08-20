import { KST_OFFSET_MS } from "@/lib/dates";

/** 저녁 컷오프(KST). 이 시각 이후 번호 등록 시 1일차를 다음날로 미룬다. */
export const NOTIFICATION_EVENING_CUTOFF_HOUR = 18;

/**
 * 알림 시작일 결정 (고객 정책, 2026-08-20):
 * - 18시 이전 등록 → 오늘이 1일차, 1일차 알림톡 즉시 발송
 * - 18시 이후 등록 → 내일이 1일차, 즉시 발송 생략 (다음날 알림 시간에 1일차 발송)
 */
export function resolveNotificationStart(): {
  startDate: string; // YYYY-MM-DD (KST)
  immediate: boolean;
} {
  const kstNow = new Date(Date.now() + KST_OFFSET_MS);
  const isEvening = kstNow.getUTCHours() >= NOTIFICATION_EVENING_CUTOFF_HOUR;
  if (isEvening) {
    const tomorrow = new Date(kstNow.getTime() + 24 * 60 * 60 * 1000);
    return { startDate: tomorrow.toISOString().slice(0, 10), immediate: false };
  }
  return { startDate: kstNow.toISOString().slice(0, 10), immediate: true };
}
