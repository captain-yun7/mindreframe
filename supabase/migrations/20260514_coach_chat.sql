-- ─────────────────────────────────────────────────────────────
-- F25 — 고객-상담사 1:1 채팅
-- 프로(주 2회) / 프리미엄(주 4회) 플랜만 사용 가능.
-- 1회 = 대화 세션 1개 (세션 내 메시지 무제한). 주 단위 카운트.
-- ─────────────────────────────────────────────────────────────

-- 1) users.role 컬럼 — 'user' | 'coach'
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- 2) 세션 테이블
CREATE TABLE IF NOT EXISTS public.coach_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS coach_chat_sessions_user_started_idx
  ON public.coach_chat_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS coach_chat_sessions_status_idx
  ON public.coach_chat_sessions(status) WHERE status = 'active';

-- 3) 메시지 테이블
CREATE TABLE IF NOT EXISTS public.coach_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.coach_chat_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id),
  sender_role text NOT NULL CHECK (sender_role IN ('user', 'coach')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coach_chat_messages_session_created_idx
  ON public.coach_chat_messages(session_id, created_at);

-- 4) 주간 세션 카운트 RPC — 가드용
--    플랜별 한도: pro=2, premium=4. 현재 주(월요일 시작) 기준 시작된 세션 수.
CREATE OR REPLACE FUNCTION public.count_coach_sessions_this_week(p_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM coach_chat_sessions
  WHERE user_id = p_user_id
    AND started_at >= date_trunc('week', now());
$$;

-- 5) RLS
ALTER TABLE public.coach_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_chat_messages ENABLE ROW LEVEL SECURITY;

-- 본인 세션 또는 coach role
DROP POLICY IF EXISTS "coach_sessions_select" ON public.coach_chat_sessions;
CREATE POLICY "coach_sessions_select" ON public.coach_chat_sessions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'coach')
  );

DROP POLICY IF EXISTS "coach_sessions_insert" ON public.coach_chat_sessions;
CREATE POLICY "coach_sessions_insert" ON public.coach_chat_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "coach_sessions_update" ON public.coach_chat_sessions;
CREATE POLICY "coach_sessions_update" ON public.coach_chat_sessions
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'coach')
  );

-- 메시지: 세션 owner 또는 coach
DROP POLICY IF EXISTS "coach_messages_select" ON public.coach_chat_messages;
CREATE POLICY "coach_messages_select" ON public.coach_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_chat_sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'coach')
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
          (sender_role = 'user' AND s.user_id = auth.uid())
          OR (sender_role = 'coach' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'coach'))
        )
    )
  );
