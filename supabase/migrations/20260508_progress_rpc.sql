-- ─────────────────────────────────────────────────────────────
-- F17 — /progress 진입 렉 개선
-- 7개 쿼리를 단일 RPC로 묶어 네트워크 round-trip 최소화.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_progress_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'totalDays',         (SELECT count(DISTINCT checked_at) FROM routine_checks WHERE user_id = p_user_id),
    'analysesCount',     (SELECT count(*) FROM chat_analyses WHERE user_id = p_user_id),
    'alternativesCount', (SELECT count(*) FROM chat_analyses WHERE user_id = p_user_id AND alternative_thought IS NOT NULL),
    'gratitudeCount',    (SELECT count(*) FROM gratitude_entries WHERE user_id = p_user_id),
    'meditationCount',   (SELECT count(*) FROM meditation_logs WHERE user_id = p_user_id),
    'distinctDates',     (SELECT coalesce(jsonb_agg(DISTINCT checked_at ORDER BY checked_at), '[]'::jsonb) FROM routine_checks WHERE user_id = p_user_id),
    'recentAlternatives',
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
       FROM (
         SELECT id, alternative_thought, created_at
         FROM chat_analyses
         WHERE user_id = p_user_id AND alternative_thought IS NOT NULL
         ORDER BY created_at DESC LIMIT 5
       ) t),
    'recentAnalyses',
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
       FROM (
         SELECT id, session_id, situation, automatic_thought, alternative_thought, distortion_types, created_at
         FROM chat_analyses
         WHERE user_id = p_user_id
         ORDER BY created_at DESC LIMIT 5
       ) t),
    'recentThoughts',
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
       FROM (
         SELECT id, situation, thought, emotion, created_at
         FROM thought_records
         WHERE user_id = p_user_id
         ORDER BY created_at DESC LIMIT 5
       ) t),
    'recentGratitudes',
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
       FROM (
         SELECT id, content, recorded_at, created_at
         FROM gratitude_entries
         WHERE user_id = p_user_id
         ORDER BY created_at DESC LIMIT 5
       ) t),
    'recentExercises',
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.completed_at DESC), '[]'::jsonb)
       FROM (
         SELECT id, exercise_key, exercise_title, note, completed_at
         FROM exercise_logs
         WHERE user_id = p_user_id
         ORDER BY completed_at DESC LIMIT 5
       ) t),
    'recentMeditations',
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.completed_at DESC), '[]'::jsonb)
       FROM (
         SELECT id, track_title, duration, completed_at
         FROM meditation_logs
         WHERE user_id = p_user_id
         ORDER BY completed_at DESC LIMIT 5
       ) t),
    'emotionPoints',
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.recorded_at), '[]'::jsonb)
       FROM (
         SELECT score, recorded_at
         FROM emotion_scores
         WHERE user_id = p_user_id
           AND source = 'routine'
           AND recorded_at >= (CURRENT_DATE - INTERVAL '13 days')
         ORDER BY recorded_at
       ) t)
  );
$$;
