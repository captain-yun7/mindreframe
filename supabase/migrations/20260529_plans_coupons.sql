-- ─────────────────────────────────────────────────────────────
-- F88 — 플랜 가격/혜택 + 쿠폰 시스템
-- 1) plans 테이블 — 가격·기간·feature 어드민 편집
-- 2) coupons 테이블 — 코드 발행, 무료/할인 적용 메타
-- 3) coupon_redemptions — 사용 이력 (감사·중복 방지)
-- ─────────────────────────────────────────────────────────────

-- touch_updated_at — 다른 마이그에서 이미 있을 수 있어 OR REPLACE
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1) plans
CREATE TABLE IF NOT EXISTS public.plans (
  slug varchar(20) PRIMARY KEY,                     -- 'light' | 'pro' | 'premium'
  name varchar(40) NOT NULL,
  amount integer NOT NULL,                          -- 원
  duration_days integer NOT NULL DEFAULT 100,
  recommended boolean NOT NULL DEFAULT false,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,      -- string[]
  guarantee_html text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id)
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
CREATE POLICY "plans_public_read" ON public.plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "plans_admin_write" ON public.plans;
CREATE POLICY "plans_admin_write" ON public.plans
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS plans_touch ON public.plans;
CREATE TRIGGER plans_touch
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.plans (slug, name, amount, duration_days, recommended, features, sort_order)
VALUES
  ('light',   '라이트',   254000, 100, false,
   '["가짜생각 분석기 5회/일","주 1회 1:1 코칭","생각쓰레기통","오늘의 루틴","알고가기(학습) 전체","나의성장방"]'::jsonb, 1),
  ('pro',     '프로',     394000, 100, true,
   '["라이트 전체 포함","가짜생각 분석기 7회/일","주 2회 1:1 코칭","행동연습장","명상하기"]'::jsonb, 2),
  ('premium', '프리미엄', 694000, 100, false,
   '["프로 전체 포함","가짜생각 분석기 무제한/일","주 4회 1:1 코칭","우선 고객 지원"]'::jsonb, 3)
ON CONFLICT (slug) DO NOTHING;

-- 2) coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  code varchar(40) PRIMARY KEY,
  description varchar(200),
  plan varchar(20) NOT NULL,
  duration_days integer NOT NULL,
  valid_from timestamptz,
  valid_until timestamptz,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  issued_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coupons_active_idx
  ON public.coupons(is_active, valid_from, valid_until);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
CREATE POLICY "coupons_admin_all" ON public.coupons
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
-- 사용자 redeem은 server action(supabaseAdmin)으로 우회.

-- 3) coupon_redemptions
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code varchar(40) NOT NULL REFERENCES public.coupons(code),
  user_id uuid NOT NULL REFERENCES public.users(id),
  applied_plan varchar(20) NOT NULL,
  applied_until timestamptz NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

-- 동일 사용자가 동일 쿠폰 1회만 사용 (메인 default 결정)
CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_unique_per_user
  ON public.coupon_redemptions(coupon_code, user_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_user_idx
  ON public.coupon_redemptions(user_id, redeemed_at DESC);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupon_redemptions_select_self" ON public.coupon_redemptions;
CREATE POLICY "coupon_redemptions_select_self" ON public.coupon_redemptions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
-- write는 supabaseAdmin server action으로만.
