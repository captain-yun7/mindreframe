-- F231 — 생각쓰레기통 대화 전체 보기 위한 schema 확장
-- 1. thought_records.session_id 추가 — chat_sessions FK
-- 2. 기존 row는 NULL 유지 (대화 메시지 없음 → progress 모달은 5요소 fallback)

ALTER TABLE public.thought_records
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.chat_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS thought_records_session_id_idx
  ON public.thought_records(session_id)
  WHERE session_id IS NOT NULL;
