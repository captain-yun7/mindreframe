-- ─────────────────────────────────────────────────────────────
-- F-admin-overhaul — 어드민 전면 개편
-- 1) get_admin_user_list RPC 확장: 플랜/역할 필터 + 정렬
-- 2) 보조 인덱스 (검색/집계 성능)
--
-- ⚠️ 본 repo 마이그레이션은 prod 자동반영 안 됨 — Supabase SQL Editor 수동 적용.
-- ─────────────────────────────────────────────────────────────

-- 1) get_admin_user_list — p_plan / p_role / p_sort 추가 (기존 인자 뒤에 DEFAULT로 호환)
DROP FUNCTION IF EXISTS public.get_admin_user_list(text, int, int);
DROP FUNCTION IF EXISTS public.get_admin_user_list(text, int, int, text, text, text);

CREATE OR REPLACE FUNCTION public.get_admin_user_list(
  p_query text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_plan text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_sort text DEFAULT 'created_desc'
)
RETURNS TABLE (
  id uuid,
  email text,
  nickname text,
  plan text,
  plan_expires_at timestamptz,
  role text,
  phone_number text,
  notifications_started_at date,
  created_at timestamptz,
  payment_status text,
  coach_sessions_this_week int,
  coach_warning text,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH base AS (
  SELECT u.*
  FROM users u
  WHERE u.deleted_at IS NULL
    AND (
      p_query IS NULL OR p_query = ''
      OR u.email ILIKE '%' || p_query || '%'
      OR u.nickname ILIKE '%' || p_query || '%'
    )
    AND (p_plan IS NULL OR p_plan = '' OR COALESCE(u.plan, 'free') = p_plan)
    AND (p_role IS NULL OR p_role = '' OR u.role = p_role)
),
latest_pay AS (
  SELECT DISTINCT ON (p.user_id) p.user_id, p.status
  FROM payments p
  WHERE p.user_id IN (SELECT id FROM base)
  ORDER BY p.user_id, p.created_at DESC
),
weekly_coach AS (
  SELECT user_id, count(*)::int AS cnt
  FROM coach_chat_sessions
  WHERE user_id IN (SELECT id FROM base)
    AND started_at >= date_trunc('week', now())
  GROUP BY user_id
)
SELECT
  b.id, b.email, b.nickname, b.plan, b.plan_expires_at, b.role, b.phone_number,
  b.notifications_started_at, b.created_at,
  lp.status AS payment_status,
  COALESCE(wc.cnt, 0) AS coach_sessions_this_week,
  CASE
    WHEN b.plan = 'pro'
         AND EXTRACT(EPOCH FROM (now() - date_trunc('week', now()))) / 86400 >= 5
         AND COALESCE(wc.cnt, 0) = 0
      THEN 'red'
    WHEN b.plan = 'premium'
         AND EXTRACT(EPOCH FROM (now() - date_trunc('week', now()))) / 86400 >= 2
         AND COALESCE(wc.cnt, 0) = 0
      THEN 'red'
    ELSE NULL
  END AS coach_warning,
  count(*) OVER () AS total_count
FROM base b
LEFT JOIN latest_pay lp ON lp.user_id = b.id
LEFT JOIN weekly_coach wc ON wc.user_id = b.id
ORDER BY
  CASE WHEN p_sort = 'created_asc'  THEN b.created_at END ASC,
  CASE WHEN p_sort = 'expires_asc'  THEN b.plan_expires_at END ASC NULLS LAST,
  CASE WHEN p_sort = 'expires_desc' THEN b.plan_expires_at END DESC NULLS LAST,
  -- 기본(created_desc 포함)
  b.created_at DESC
LIMIT p_limit OFFSET p_offset;
$$;

-- 2) 보조 인덱스
CREATE INDEX IF NOT EXISTS payments_user_created_idx
  ON public.payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_created_idx
  ON public.payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_order_id_idx
  ON public.payments(order_id);
