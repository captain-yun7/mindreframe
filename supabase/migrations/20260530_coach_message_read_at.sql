-- ─────────────────────────────────────────────────────────────
-- K7·F154 — 카톡식 안 읽음 배지
-- coach_chat_messages.read_at 추가.
--
-- 의미:
--   sender_role='coach' 메시지의 read_at: 사용자(고객)가 읽은 시각
--   sender_role='user'  메시지의 read_at: 코치(어드민)가 읽은 시각
--
-- unread count 계산 (사용자 측 — 받은 코치 답변):
--   SELECT count(*) FROM coach_chat_messages
--   WHERE session_id IN (사용자 본인 세션들) AND sender_role='coach' AND read_at IS NULL;
--
-- unread count 계산 (어드민 측 — 사용자 메시지):
--   SELECT count(*) FROM coach_chat_messages
--   WHERE sender_role='user' AND read_at IS NULL;
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.coach_chat_messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- unread 인덱스 — partial index, NULL만 빠르게 카운트
CREATE INDEX IF NOT EXISTS coach_chat_messages_unread_idx
  ON public.coach_chat_messages(session_id, sender_role)
  WHERE read_at IS NULL;

-- 사용자 측: 본인 세션의 coach 메시지 unread 수
CREATE OR REPLACE FUNCTION public.count_unread_coach_messages_for_user(p_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM coach_chat_messages m
  JOIN coach_chat_sessions s ON s.id = m.session_id
  WHERE s.user_id = p_user_id
    AND m.sender_role = 'coach'
    AND m.read_at IS NULL;
$$;

-- 어드민 측: 사용자 메시지 unread 수 (특정 user_id별 또는 전체)
CREATE OR REPLACE FUNCTION public.count_unread_user_messages_for_admin()
RETURNS TABLE(user_id uuid, unread_count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.user_id, count(*)::int AS unread_count
  FROM coach_chat_messages m
  JOIN coach_chat_sessions s ON s.id = m.session_id
  WHERE m.sender_role = 'user'
    AND m.read_at IS NULL
  GROUP BY s.user_id;
$$;

-- 사용자가 코치 메시지 읽음 처리 — 본인 세션의 미읽음 coach 메시지 전부 일괄
CREATE OR REPLACE FUNCTION public.mark_coach_messages_read(p_session_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_updated int;
  v_caller uuid := auth.uid();
BEGIN
  -- 세션 소유자 확인
  IF NOT EXISTS (
    SELECT 1 FROM coach_chat_sessions
    WHERE id = p_session_id AND user_id = v_caller
  ) THEN
    RETURN 0;
  END IF;

  UPDATE coach_chat_messages
    SET read_at = now()
    WHERE session_id = p_session_id
      AND sender_role = 'coach'
      AND read_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- 어드민(코치)이 사용자 메시지 읽음 처리
CREATE OR REPLACE FUNCTION public.mark_user_messages_read(p_session_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
  v_caller uuid := auth.uid();
  v_is_coach boolean;
BEGIN
  -- 코치 권한 확인
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = v_caller AND role IN ('coach', 'admin')
  ) INTO v_is_coach;

  IF NOT v_is_coach THEN
    RETURN 0;
  END IF;

  UPDATE coach_chat_messages
    SET read_at = now()
    WHERE session_id = p_session_id
      AND sender_role = 'user'
      AND read_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- realtime publish — 이미 등록되어 있다면 NOTICE만 출력하고 무시
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.coach_chat_messages;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'coach_chat_messages already in supabase_realtime publication';
  WHEN OTHERS THEN
    RAISE NOTICE 'supabase_realtime publication not available: %', SQLERRM;
END $$;
