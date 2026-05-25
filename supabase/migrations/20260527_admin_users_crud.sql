-- ─────────────────────────────────────────────────────────────
-- F71 — 어드민 사용자 CRUD 확장
-- 1) users.deleted_at 컬럼 (소프트 삭제)
-- 2) admin_audit_logs 테이블 (위험 액션 감사)
-- 3) get_admin_user_list RPC (회원 목록 컬럼 + F87 빨간 경고 통합)
--
-- lib/db/schema.ts:30에 deletedAt이 이미 선언돼 있으나 실제 DB엔 미반영(schema drift).
-- 본 마이그레이션에서 정합화.
-- ─────────────────────────────────────────────────────────────

-- 1) users.deleted_at
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS users_active_created_idx
  ON public.users (created_at DESC)
  WHERE deleted_at IS NULL;

-- 2) admin_audit_logs — 위험 액션 감사 로그
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES public.users(id),
  action text NOT NULL,
  target_user_id uuid REFERENCES public.users(id),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_created_idx
  ON public.admin_audit_logs (admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_target_created_idx
  ON public.admin_audit_logs (target_user_id, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_select" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_select" ON public.admin_audit_logs
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- write는 server action에서 service-role로만 수행 (RLS bypass)

-- touch_updated_at — 다른 마이그레이션에 이미 정의됐을 수 있어 OR REPLACE 안전 등록
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) get_admin_user_list RPC — 회원 목록 + 결제 상태 + 주간 코치 사용량 + F87 경고 통합
-- 페이지네이션 + 검색 + window count.
-- 호출은 server action에서 supabaseAdmin(service-role)로 수행 — RLS bypass + admin 가드는 ensureAdmin().
CREATE OR REPLACE FUNCTION public.get_admin_user_list(
  p_query text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
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
      p_query IS NULL
      OR p_query = ''
      OR u.email ILIKE '%' || p_query || '%'
      OR u.nickname ILIKE '%' || p_query || '%'
    )
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
    -- F87 pro: 주2회 한도 + 주 시작 5일 경과 + 0회 → red
    WHEN b.plan = 'pro'
         AND EXTRACT(EPOCH FROM (now() - date_trunc('week', now()))) / 86400 >= 5
         AND COALESCE(wc.cnt, 0) = 0
      THEN 'red'
    -- F87 premium: 주4회 한도 + 주 시작 2일 경과 + 0회 → red (더 엄격)
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
ORDER BY b.created_at DESC
LIMIT p_limit OFFSET p_offset;
$$;
