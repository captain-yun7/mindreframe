-- ─────────────────────────────────────────────────────────────
-- F86 — 100일 알림 메시지 일차별 콘텐츠 DB 이전
-- 기존: lib/notification-messages.ts 코드 박힘 100개
-- 카카오 알림톡 #{content} 변수에 들어가는 본문만 자유 편집
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_messages (
  day_number integer PRIMARY KEY CHECK (day_number BETWEEN 1 AND 100),
  title varchar(80),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 200),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id)
);

ALTER TABLE public.notification_messages ENABLE ROW LEVEL SECURITY;

-- 일반 사용자에게 노출 X (cron handler가 service-role로 접근)
-- admin role만 SELECT/INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "notification_messages_admin_read" ON public.notification_messages;
CREATE POLICY "notification_messages_admin_read" ON public.notification_messages
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "notification_messages_admin_write" ON public.notification_messages;
CREATE POLICY "notification_messages_admin_write" ON public.notification_messages
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- touch_updated_at trigger (다른 마이그레이션에서 이미 등록됐다면 OR REPLACE로 안전)
-- 적용 순서 의존성 제거: 본 파일만 단독 적용해도 깨지지 않음.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_messages_touch ON public.notification_messages;
CREATE TRIGGER notification_messages_touch
  BEFORE UPDATE ON public.notification_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
