-- ─────────────────────────────────────────────────────────────
-- F24 — 카카오 알림톡 발송
-- 결제 시 휴대폰 수집, 마이페이지에서 발송 시간 수정 가능.
-- 매일 1통, 가입(결제)일+N일차 메시지 발송. 한도/실패는 notification_logs에 기록.
-- ─────────────────────────────────────────────────────────────

-- 1) users에 휴대폰·발송 시간·시작일 컬럼
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS notification_hour integer NOT NULL DEFAULT 9
    CHECK (notification_hour BETWEEN 8 AND 20),
  ADD COLUMN IF NOT EXISTS notifications_started_at date;

-- notifications_started_at: 결제 완료 시점에 채워짐. NULL이면 발송 안 함.
CREATE INDEX IF NOT EXISTS users_notifications_hour_started_idx
  ON public.users(notification_hour, notifications_started_at)
  WHERE notifications_started_at IS NOT NULL;

-- 2) 발송 이력 테이블
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_number integer NOT NULL,                          -- 1~100
  channel text NOT NULL DEFAULT 'kakao_alimtalk',
  status text NOT NULL DEFAULT 'pending'                -- pending | sent | failed
    CHECK (status IN ('pending', 'sent', 'failed')),
  external_message_id text,                             -- Solapi message id
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- 같은 유저에게 같은 day는 1번만 발송
  CONSTRAINT notification_logs_user_day_uniq UNIQUE (user_id, day_number)
);
CREATE INDEX IF NOT EXISTS notification_logs_status_idx
  ON public.notification_logs(status, created_at);

-- 3) RLS — 본인 로그만 조회 (서비스 키로 INSERT/UPDATE)
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_logs_self_select" ON public.notification_logs;
CREATE POLICY "notification_logs_self_select" ON public.notification_logs
  FOR SELECT USING (auth.uid() = user_id);
