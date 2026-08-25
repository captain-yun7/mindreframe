-- 플랜 시작일(결제/쿠폰 등록일) 컬럼 추가 (2026-08-25 고객 피드백)
-- 100일 차수는 가입일이 아니라 "플랜을 결제한 날"부터 계산되어야 함.

alter table public.users add column if not exists plan_started_at date;

-- 백필 1: 쿠폰으로 활성화된 유저 — 쿠폰 등록일
update public.users u
set plan_started_at = r.redeemed::date
from (
  select user_id, min(redeemed_at) as redeemed
  from public.coupon_redemptions
  group by user_id
) r
where u.id = r.user_id
  and u.plan <> 'free'
  and u.plan_started_at is null;

-- 백필 2: 결제 완료 유저 — 최초 결제일
update public.users u
set plan_started_at = p.paid::date
from (
  select user_id, min(paid_at) as paid
  from public.payments
  where status = 'paid'
  group by user_id
) p
where u.id = p.user_id
  and u.plan <> 'free'
  and u.plan_started_at is null;

-- 백필 3: 그 외 유료 유저(어드민 수동 부여 등) — 만료일 - 100일 추정
update public.users
set plan_started_at = (plan_expires_at - interval '100 days')::date
where plan <> 'free'
  and plan_expires_at is not null
  and plan_started_at is null;
