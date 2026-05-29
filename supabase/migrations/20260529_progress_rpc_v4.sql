-- J2 / F150·F151: progress RPC v4 — 명상·감사 레벨 추가
--
-- 신규 키: meditationLevel, gratitudeLevel
-- 공식 (통일): <1=0, <10=1, <30=2, <60=3, 이후 +30마다 +1 (90=5, 120=6, ...)
-- courageLevel은 F116 호환 위해 기존 /5 그대로 유지.
--
-- v3와 동일한 모든 키를 유지하고 마지막 2키만 추가.

CREATE OR REPLACE FUNCTION public.get_progress_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH meditation_count AS (
    SELECT count(*)::int AS n FROM meditation_logs WHERE user_id = p_user_id
  ),
  gratitude_count AS (
    SELECT count(*)::int AS n FROM gratitude_entries WHERE user_id = p_user_id
  )
  SELECT jsonb_build_object(
    'totalDays',         (SELECT count(DISTINCT checked_at) FROM routine_checks WHERE user_id = p_user_id),
    'analysesCount',     (SELECT count(*) FROM chat_analyses WHERE user_id = p_user_id),
    'alternativesCount', (SELECT count(*) FROM chat_analyses WHERE user_id = p_user_id AND alternative_thought IS NOT NULL),
    'gratitudeCount',    (SELECT n FROM gratitude_count),
    'meditationCount',   (SELECT n FROM meditation_count),
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
         SELECT id, situation, thought, emotion, body_reaction, behavior, created_at
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
         SELECT id, exercise_key, exercise_title, note, completed_at,
                floor((rn - 1)::numeric / 5) + 1 AS courage_level
         FROM (
           SELECT id, exercise_key, exercise_title, note, completed_at,
                  row_number() OVER (ORDER BY completed_at) AS rn
           FROM exercise_logs
           WHERE user_id = p_user_id
         ) seq
         ORDER BY completed_at DESC LIMIT 8
       ) t),
    'recentMeditations',
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.completed_at DESC), '[]'::jsonb)
       FROM (
         SELECT id, track_title, duration, completed_at
         FROM meditation_logs
         WHERE user_id = p_user_id
         ORDER BY completed_at DESC LIMIT 5
       ) t),
    'courageLevel',
      (SELECT CASE WHEN count(*) > 0 THEN floor((count(*) - 1)::numeric / 5) + 1 ELSE 0 END
       FROM exercise_logs WHERE user_id = p_user_id),
    'totalExercises',
      (SELECT count(*) FROM exercise_logs WHERE user_id = p_user_id),
    'emotionPoints',
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.recorded_at), '[]'::jsonb)
       FROM (
         SELECT score, recorded_at
         FROM emotion_scores
         WHERE user_id = p_user_id
           AND source = 'routine'
         ORDER BY recorded_at DESC
         LIMIT 365
       ) t),
    -- J2 / F150
    'meditationLevel',
      (SELECT CASE
        WHEN n < 1  THEN 0
        WHEN n < 10 THEN 1
        WHEN n < 30 THEN 2
        WHEN n < 60 THEN 3
        ELSE 4 + ((n - 60) / 30)
       END FROM meditation_count),
    -- J2 / F151
    'gratitudeLevel',
      (SELECT CASE
        WHEN n < 1  THEN 0
        WHEN n < 10 THEN 1
        WHEN n < 30 THEN 2
        WHEN n < 60 THEN 3
        ELSE 4 + ((n - 60) / 30)
       END FROM gratitude_count)
  );
$$;
