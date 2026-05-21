-- ─────────────────────────────────────────────────────────────
-- F48 — /dashboard 진입 지연 단축
-- 4개 쿼리(mood/gratitude/today checks/all dates) → 단일 jsonb RPC로 묶음.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_today_dashboard(p_user_id uuid, p_today date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'mood',
      (SELECT score FROM emotion_scores
        WHERE user_id = p_user_id
          AND recorded_at = p_today
          AND source = 'routine'
        LIMIT 1),
    'gratitude',
      (SELECT row_to_json(g) FROM (
        SELECT id, content
        FROM gratitude_entries
        WHERE user_id = p_user_id AND recorded_at = p_today
        ORDER BY created_at DESC
        LIMIT 1
      ) g),
    'todayCheckedKeys',
      (SELECT coalesce(jsonb_agg(item_key), '[]'::jsonb)
        FROM routine_checks
        WHERE user_id = p_user_id AND checked_at = p_today),
    'allCheckedDates',
      (SELECT coalesce(jsonb_agg(DISTINCT checked_at ORDER BY checked_at), '[]'::jsonb)
        FROM routine_checks
        WHERE user_id = p_user_id)
  );
$$;
