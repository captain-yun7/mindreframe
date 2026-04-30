-- ─────────────────────────────────────────────────────────────
-- RLS 정책 — 모든 사용자 데이터 테이블에 적용
-- 본인 데이터만 INSERT/SELECT/UPDATE/DELETE 가능
-- ─────────────────────────────────────────────────────────────

-- public.users는 트리거가 자동 삽입하므로 서비스 키만 쓰기 가능
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_self_select" ON public.users;
CREATE POLICY "users_self_select" ON public.users
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "users_self_update" ON public.users;
CREATE POLICY "users_self_update" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ─── 사용자별 데이터 테이블 (user_id = auth.uid()) ───
DO $$
DECLARE
  t text;
  user_tables text[] := ARRAY[
    'survey_responses',
    'chat_sessions',
    'chat_analyses',
    'thought_records',
    'gratitude_entries',
    'emotion_scores',
    'routine_checks',
    'exercise_logs',
    'meditation_logs',
    'study_progress',
    'user_badges',
    'ai_usage',
    'subscriptions',
    'payments'
  ];
BEGIN
  FOREACH t IN ARRAY user_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_self_all" ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY "%s_self_all" ON public.%I
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)
    $p$, t, t);
  END LOOP;
END $$;

-- ─── chat_messages — sessionId 통해 user 검증 ───
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_messages_via_session" ON public.chat_messages;
CREATE POLICY "chat_messages_via_session" ON public.chat_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()
    )
  );

-- ─── 공개 콘텐츠 (모두 SELECT 허용, 서비스 키만 INSERT) ───
DO $$
DECLARE
  t text;
  content_tables text[] := ARRAY['study_contents', 'exercises', 'meditation_tracks', 'badges'];
BEGIN
  FOREACH t IN ARRAY content_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_public_read" ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY "%s_public_read" ON public.%I
        FOR SELECT USING (true)
    $p$, t, t);
  END LOOP;
END $$;
