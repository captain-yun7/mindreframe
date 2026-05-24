-- F72 — /progress, /coach 진입 시 RPC·서브쿼리에 활용되는 인덱스.
-- 실측(EXPLAIN ANALYZE) 후 적용 결정. 일단 마이그레이션 파일만 등록.

-- 감사일기 페이지네이션(F69 loadMoreGratitudes) + RPC sub-select
CREATE INDEX IF NOT EXISTS idx_gratitude_user_created
  ON gratitude_entries(user_id, created_at DESC);

-- chat_analyses sub-select (recentAlternatives, recentAnalyses)
CREATE INDEX IF NOT EXISTS idx_chat_analyses_user_created
  ON chat_analyses(user_id, created_at DESC);

-- meditation_logs sub-select (recentMeditations)
CREATE INDEX IF NOT EXISTS idx_meditation_user_completed
  ON meditation_logs(user_id, completed_at DESC);

-- exercise_logs sub-select (recentExercises)
CREATE INDEX IF NOT EXISTS idx_exercise_user_completed
  ON exercise_logs(user_id, completed_at DESC);

-- thought_records sub-select (recentThoughts)
CREATE INDEX IF NOT EXISTS idx_thought_user_created
  ON thought_records(user_id, created_at DESC);

-- routine_checks distinct dates count (streak / totalDays)
CREATE INDEX IF NOT EXISTS idx_routine_user
  ON routine_checks(user_id);
