-- ─────────────────────────────────────────────────────────────
-- 월 구독(9,900원/월, 토스 자동결제) — 2회 이상 결제자 전용
-- subscriptions 테이블은 초기 스키마(drizzle 0000)에 있으나 미사용이었음 → 없으면 생성 + 컬럼 보강
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'active',
  plan text NOT NULL,
  billing_key text,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- status: active(정상) / past_due(갱신 결제 실패, 재시도 중) / cancelled(해지 — 기간 끝까지 이용) / expired(종료)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS customer_key text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS amount integer;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS card_label text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_failure_message text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 사용자당 진행 중 구독은 1개 (중복 등록·중복 과금 방지)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_live_per_user
  ON public.subscriptions (user_id)
  WHERE status IN ('active', 'past_due');

CREATE INDEX IF NOT EXISTS subscriptions_renewal_idx
  ON public.subscriptions (status, current_period_end);

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscriptions(id);

-- RLS: 본인 행은 조회만. 쓰기는 서버(service role)만.
-- 기존 *_self_all(FOR ALL)은 회원이 자기 결제 행을 'paid'로 만들 수 있어 월 구독 자격(2회 결제)을 위조 가능 → 제거
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_self_all" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_self_all" ON public.payments;
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);
