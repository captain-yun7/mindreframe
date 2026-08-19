-- coach_chat_sessions select 정책 보완 (2026-08-19)
-- 기존 정책의 "coach_id IS NULL" 조건이 익명(anon) 포함 모든 요청에 세션 목록을 노출.
-- 코치/어드민 접근은 EXISTS(role in coach,admin) 조건으로 이미 충족되고
-- (어드민 화면은 서비스롤로 조회하므로 RLS 의존도 없음) 해당 조건을 제거한다.

DROP POLICY IF EXISTS "coach_sessions_select" ON public.coach_chat_sessions;
CREATE POLICY "coach_sessions_select" ON public.coach_chat_sessions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );
