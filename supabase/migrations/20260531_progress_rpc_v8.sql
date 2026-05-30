-- F233 — progress RPC v8: alternativesCount를 "대안 카드 총 개수"로 산정
-- 기존: chat_analyses에서 alternative_thought IS NOT NULL row 수 (분석 건수 ≈ 6)
-- 변경: 신규 포맷 JSON 배열 [{"인지왜곡":"...","합리적사고":"..."}, ...] 안의 entry 합
--       (= 대안적 사고 카드 N개 합산. 사용자 시각화와 일치).
-- 안전: jsonb cast 시도 실패 케이스 대비 — alternative_thought에서 '"인지왜곡"' 등장 횟수 기반.
--       (cast 없이 string-count → cast 에러 zero risk).
-- 레거시 plain text(JSON 배열 아님)은 카드 1개로 카운트.

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
    'alternativesCount',
      (SELECT coalesce(sum(
         CASE
           WHEN alternative_thought IS NULL OR length(trim(alternative_thought)) = 0 THEN 0
           WHEN alternative_thought LIKE '%"인지왜곡"%' THEN
             (length(alternative_thought) - length(replace(alternative_thought, '"인지왜곡"', ''))) / length('"인지왜곡"')
           ELSE 1
         END
       ), 0)::int
       FROM chat_analyses WHERE user_id = p_user_id),
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
         SELECT id, session_id, situation, automatic_thought, alternative_thought, distortion_types, created_at, sequence_no
         FROM (
           SELECT id, session_id, situation, automatic_thought, alternative_thought, distortion_types, created_at,
                  row_number() OVER (ORDER BY created_at) AS sequence_no
           FROM chat_analyses
           WHERE user_id = p_user_id
         ) seq
         ORDER BY created_at DESC LIMIT 5
       ) t),
    'recentThoughts',
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
       FROM (
         SELECT id, session_id, situation, thought, emotion, body_reaction, behavior, created_at, sequence_no
         FROM (
           SELECT id, session_id, situation, thought, emotion, body_reaction, behavior, created_at,
                  row_number() OVER (ORDER BY created_at) AS sequence_no
           FROM thought_records
           WHERE user_id = p_user_id
         ) seq
         ORDER BY created_at DESC LIMIT 5
       ) t),
    'recentGratitudes',
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
       FROM (
         SELECT id, content, recorded_at, created_at, sequence_no
         FROM (
           SELECT id, content, recorded_at, created_at,
                  row_number() OVER (ORDER BY created_at) AS sequence_no
           FROM gratitude_entries
           WHERE user_id = p_user_id
         ) seq
         ORDER BY created_at DESC LIMIT 5
       ) t),
    'recentExercises',
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.completed_at DESC), '[]'::jsonb)
       FROM (
         SELECT id, exercise_key, exercise_title, note, completed_at,
                rn AS sequence_no,
                floor((rn - 1)::numeric / 5) + 1 AS courage_level
         FROM (
           SELECT id, exercise_key, exercise_title, note, completed_at,
                  row_number() OVER (ORDER BY completed_at) AS rn
           FROM exercise_logs
           WHERE user_id = p_user_id
         ) seq
         ORDER BY completed_at DESC LIMIT 5
       ) t),
    'recentMeditations',
      (SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.completed_at DESC), '[]'::jsonb)
       FROM (
         SELECT id, track_title, duration, completed_at, sequence_no
         FROM (
           SELECT id, track_title, duration, completed_at,
                  row_number() OVER (ORDER BY completed_at) AS sequence_no
           FROM meditation_logs
           WHERE user_id = p_user_id
         ) seq
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
    'meditationLevel',
      (SELECT CASE
        WHEN n < 1  THEN 0
        WHEN n < 10 THEN 1
        WHEN n < 30 THEN 2
        WHEN n < 60 THEN 3
        ELSE 4 + ((n - 60) / 30)
       END FROM meditation_count),
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
