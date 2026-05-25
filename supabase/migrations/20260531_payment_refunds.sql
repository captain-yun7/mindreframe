-- ─────────────────────────────────────────────────────────────
-- F91 — 결제 환불 메타 컬럼
-- payments.refunded_at / refund_reason / refund_amount / refunded_by
-- 정책: 풀 환불만 1차 (부분 환불·일할 계산은 차후)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refund_amount integer,
  ADD COLUMN IF NOT EXISTS refunded_by uuid REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS payments_refunded_at_idx
  ON public.payments(refunded_at)
  WHERE refunded_at IS NOT NULL;
