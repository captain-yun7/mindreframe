-- ─────────────────────────────────────────────────────────────
-- F82 — 행동연습장 코치 열람 (동의 기반)
-- 사용자 토글 — 동의한 경우에만 코치/admin이 exercise_logs 열람 가능
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS allow_coach_view_exercise boolean NOT NULL DEFAULT false;

-- exercise_logs RLS 보강 — 동의한 사용자의 로그를 coach/admin이 SELECT 가능
-- 기존 사용자 SELF select 정책은 유지 (별도 정책 추가)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'exercise_logs'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "exercise_logs_coach_view_with_consent" ON public.exercise_logs';
    EXECUTE $POL$
      CREATE POLICY "exercise_logs_coach_view_with_consent" ON public.exercise_logs
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = exercise_logs.user_id
              AND u.allow_coach_view_exercise = true
          )
          AND EXISTS (
            SELECT 1 FROM public.users me
            WHERE me.id = auth.uid()
              AND me.role IN ('coach', 'admin')
          )
        )
    $POL$;
  END IF;
END $$;
