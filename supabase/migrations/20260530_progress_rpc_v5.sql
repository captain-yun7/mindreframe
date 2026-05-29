-- K6 / F210·F212·F213: progress RPC v5 — row별 시퀀스 카운트 + 레벨 노출 정리
--
-- 변경:
--  1. recentExercises 8개 → 5개 (F208 더보기 패턴 통일)
--  2. recentGratitudes / recentMeditations / recentThoughts / recentAnalyses 5개 유지
--  3. recentExercises·recentMeditations·recentGratitudes 각 row에 sequence_no 추가
--     (오래된 항목부터 1, 2, 3… 부여 — F210 순차 카운트, F212 row별 레벨 산정에 사용)
--  4. courage_level은 row별 floor((rn-1)/5)+1 유지 (이미 v3에서 도입)
--  5. recentExercises의 rn은 anxiety + depress + courage 전체 도전 기준 (기존과 동일)
--  6. 합산 배지는 제거되지만, KPI용 courageLevel·meditationLevel·gratitudeLevel 키는 호환을 위해 유지
--     (호출부에서 더 이상 사용하지 않음)

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
