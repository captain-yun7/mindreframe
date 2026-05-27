-- H5: progress RPC v3 — 행동연습장 기록에 courage_level 시퀀스 추가 (F116)
-- + F118 emotionPoints 전체 기간 fetch (날짜 필터 제거)
--
-- courage_level 산식: 도전 5회마다 1레벨 (1~5회=레벨1, 6~10회=레벨2, ...)
-- recentExercises 각 row에는 그 도전 직후 도달한 레벨을 표시.
--
-- emotion 차트는 클라이언트에서 14일/전체 토글 — RPC는 전체 반환 후 클라이언트 슬라이스.

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
         -- H5/F116: courage_level 시퀀스 — 오래된 도전 순으로 row_number를 매기고 floor((rn-1)/5)+1
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
      -- F118: 14일 제한 제거 — 클라이언트가 토글로 슬라이스 (성능 보호 위해 limit 365)
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.recorded_at), '[]'::jsonb)
       FROM (
         SELECT score, recorded_at
         FROM emotion_scores
         WHERE user_id = p_user_id
           AND source = 'routine'
         ORDER BY recorded_at DESC
         LIMIT 365
       ) t)
  );
$$;
