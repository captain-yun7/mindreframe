-- ─────────────────────────────────────────────────────────────
-- meditation_logs / exercise_logs / study_progress
-- track_id, exercise_id, study_content_id를 nullable로 변경하고
-- slug 컬럼을 추가해 시드 데이터 없이도 로그 저장 가능하게 함.
-- 시드가 들어오면 후속 작업으로 slug → id 매핑.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.meditation_logs ALTER COLUMN track_id DROP NOT NULL;
ALTER TABLE public.meditation_logs ADD COLUMN IF NOT EXISTS track_slug text;
ALTER TABLE public.meditation_logs ADD COLUMN IF NOT EXISTS track_title text;

ALTER TABLE public.exercise_logs ALTER COLUMN exercise_id DROP NOT NULL;
ALTER TABLE public.exercise_logs ADD COLUMN IF NOT EXISTS exercise_key text;
ALTER TABLE public.exercise_logs ADD COLUMN IF NOT EXISTS exercise_title text;

ALTER TABLE public.study_progress ALTER COLUMN study_content_id DROP NOT NULL;
ALTER TABLE public.study_progress ADD COLUMN IF NOT EXISTS content_slug text;
