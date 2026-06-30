/**
 * 어드민 라벨/상태 매핑 SSOT — 한국어 표기 + 배지 톤을 한 곳에서.
 */

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger";

type BadgeMap = Record<string, { label: string; tone: BadgeTone }>;

/** 결제 상태 */
export const PAYMENT_STATUS: BadgeMap = {
  paid: { label: "결제완료", tone: "success" },
  done: { label: "결제완료", tone: "success" },
  pending: { label: "대기", tone: "warning" },
  ready: { label: "준비", tone: "neutral" },
  failed: { label: "실패", tone: "danger" },
  cancelled: { label: "취소", tone: "neutral" },
  canceled: { label: "취소", tone: "neutral" },
  refunded: { label: "환불", tone: "danger" },
};

/** 알림 발송 상태 */
export const NOTIFICATION_STATUS: BadgeMap = {
  sent: { label: "발송완료", tone: "success" },
  pending: { label: "대기", tone: "warning" },
  failed: { label: "실패", tone: "danger" },
  skipped: { label: "건너뜀", tone: "neutral" },
};

/** 구독 상태 */
export const SUBSCRIPTION_STATUS: BadgeMap = {
  active: { label: "활성", tone: "success" },
  cancelled: { label: "해지", tone: "neutral" },
  canceled: { label: "해지", tone: "neutral" },
  paused: { label: "일시정지", tone: "warning" },
  expired: { label: "만료", tone: "danger" },
};

/** 코치 세션 상태 */
export const COACH_STATUS: BadgeMap = {
  active: { label: "진행중", tone: "success" },
  ended: { label: "종료", tone: "neutral" },
  closed: { label: "종료", tone: "neutral" },
};

/** 플랜 */
export const PLAN_LABEL: Record<string, string> = {
  free: "무료",
  light: "라이트",
  pro: "프로",
  premium: "프리미엄",
};

export const PLAN_TONE: Record<string, BadgeTone> = {
  free: "neutral",
  light: "primary",
  pro: "primary",
  premium: "success",
};

/** 권한 */
export const ROLE_LABEL: Record<string, string> = {
  user: "사용자",
  coach: "코치",
  admin: "관리자",
};

/** 감사로그 액션 — 사람이 읽는 라벨 */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "user.create": "사용자 생성",
  "user.create_sync_failed": "사용자 생성(동기화 실패)",
  "user.update_plan": "플랜 변경",
  "user.update_role": "권한 변경",
  "user.update_nickname": "닉네임 변경",
  "user.update_notification": "알림 설정 변경",
  "user.update_telegram_chat_id": "텔레그램 chat_id 변경",
  "user.delete": "사용자 삭제",
  "payment.refund": "결제 환불",
  "coupon.create": "쿠폰 생성",
  "coupon.update": "쿠폰 수정",
  "coupon.deactivate": "쿠폰 비활성화",
  "coupon.delete": "쿠폰 삭제",
  "plan.update": "플랜 수정",
  "subscription.cancel": "구독 해지",
  "subscription.resume": "구독 재개",
  "notification.resend": "알림 재발송",
  "study.create": "알고가기 글 생성",
  "study.update": "알고가기 글 수정",
  "study.delete": "알고가기 글 삭제",
  "meditation.create": "명상 생성",
  "meditation.update": "명상 수정",
  "meditation.delete": "명상 삭제",
  "notification_message.update": "알림 메시지 수정",
  "site_setting.update": "사이트 설정 변경",
  "exercise.create": "운동 생성",
  "exercise.update": "운동 수정",
  "exercise.delete": "운동 삭제",
  "badge.create": "뱃지 생성",
  "badge.update": "뱃지 수정",
  "badge.delete": "뱃지 삭제",
  "badge.grant": "뱃지 수동 부여",
  "badge.revoke": "뱃지 회수",
};

export function planLabel(plan: string | null | undefined): string {
  if (!plan) return PLAN_LABEL.free;
  return PLAN_LABEL[plan] ?? plan;
}

export function roleLabel(role: string | null | undefined): string {
  if (!role) return ROLE_LABEL.user;
  return ROLE_LABEL[role] ?? role;
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}
