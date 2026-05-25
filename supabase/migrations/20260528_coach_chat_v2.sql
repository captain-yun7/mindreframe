-- ─────────────────────────────────────────────────────────────
-- F73 + F74 — 코치 채팅 v2
-- - coach_chat_sessions: coach_id, ended_by, first_coach_reply_at
-- - users: coach_session_adjustment, telegram_chat_id
-- - coach_user_notes 신설
-- - RLS 재작성 (본인 + 매칭 coach + admin)
-- - count_coach_sessions_this_week → adjustment 합산
-- - 인덱스 보강
-- - Realtime publication 추가
-- ─────────────────────────────────────────────────────────────

-- 1) coach_chat_sessions 보강
ALTER TABLE public.coach_chat_sessions
  ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS ended_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS first_coach_reply_at timestamptz;

CREATE INDEX IF NOT EXISTS coach_chat_sessions_coach_started_idx
  ON public.coach_chat_sessions(coach_id, started_at DESC);

-- 2) users 보강
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS coach_session_adjustment integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS telegram_chat_id varchar;

-- 3) coach_user_notes
CREATE TABLE IF NOT EXISTS public.coach_user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.users(id),
  user_id  uuid NOT NULL REFERENCES public.users(id),
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coach_user_notes_coach_user_idx
  ON public.coach_user_notes(coach_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS coach_user_notes_user_idx
  ON public.coach_user_notes(user_id, created_at DESC);

ALTER TABLE public.coach_user_notes ENABLE ROW LEVEL SECURITY;

-- 본인 코치 또는 admin만 SELECT
DROP POLICY IF EXISTS "coach_notes_select" ON public.coach_user_notes;
CREATE POLICY "coach_notes_select" ON public.coach_user_notes
  FOR SELECT
  USING (
    coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- 본인 코치만 INSERT (coach_id = auth.uid())
DROP POLICY IF EXISTS "coach_notes_insert" ON public.coach_user_notes;
CREATE POLICY "coach_notes_insert" ON public.coach_user_notes
  FOR INSERT
  WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- 본인 메모만 DELETE
DROP POLICY IF EXISTS "coach_notes_delete" ON public.coach_user_notes;
CREATE POLICY "coach_notes_delete" ON public.coach_user_notes
  FOR DELETE
  USING (coach_id = auth.uid());

-- 4) coach_chat_sessions RLS 재작성 (admin 포함, 매칭 coach 분리)
DROP POLICY IF EXISTS "coach_sessions_select" ON public.coach_chat_sessions;
CREATE POLICY "coach_sessions_select" ON public.coach_chat_sessions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR coach_id = auth.uid()
    OR coach_id IS NULL  -- 미매칭 세션은 모든 coach가 잠재적으로 잡을 수 있도록 (운영 1명 가정 fallback)
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

DROP POLICY IF EXISTS "coach_sessions_update" ON public.coach_chat_sessions;
CREATE POLICY "coach_sessions_update" ON public.coach_chat_sessions
  FOR UPDATE
  USING (
    coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- INSERT 정책은 5/14 그대로 유지 (user_id = auth.uid())

-- 5) coach_chat_messages RLS 재작성
DROP POLICY IF EXISTS "coach_messages_select" ON public.coach_chat_messages;
CREATE POLICY "coach_messages_select" ON public.coach_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_chat_sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = auth.uid()
          OR s.coach_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('coach', 'admin'))
        )
    )
  );

DROP POLICY IF EXISTS "coach_messages_insert" ON public.coach_chat_messages;
CREATE POLICY "coach_messages_insert" ON public.coach_chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.coach_chat_sessions s
      WHERE s.id = session_id
        AND s.status = 'active'
        AND (
          (sender_role = 'user'  AND s.user_id = auth.uid())
          OR (sender_role = 'coach' AND EXISTS (
              SELECT 1 FROM public.users
              WHERE id = auth.uid() AND role IN ('coach', 'admin')))
        )
    )
  );

-- 6) count_coach_sessions_this_week → adjustment 합산
-- adjustment 양수 = 한도 추가(used 차감), 음수 = 차감(used 증가). GREATEST(0,...)로 음수 clamp.
CREATE OR REPLACE FUNCTION public.count_coach_sessions_this_week(p_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT GREATEST(
    0,
    (SELECT count(*)::int FROM coach_chat_sessions
     WHERE user_id = p_user_id
       AND started_at >= date_trunc('week', now()))
    - COALESCE((SELECT coach_session_adjustment FROM users WHERE id = p_user_id), 0)
  );
$$;

-- 7) Realtime publication에 두 테이블 추가 (idempotent)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_chat_messages;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_chat_sessions;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
