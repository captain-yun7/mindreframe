-- F140 — 요금제 features 갱신
-- 기존 20260529_plans_coupons.sql 의 seed 는 ON CONFLICT DO NOTHING — 이미 INSERT 된 row 에 적용 안 됨.
-- 본 마이그는 명세된 features 로 강제 UPDATE.

UPDATE public.plans
SET features = '[
  "가짜생각 분석기 5회/일",
  "생각쓰레기통 5회/일",
  "주 1회 1:1 코칭",
  "행동연습장",
  "명상하기",
  "오늘의 루틴",
  "알고가기(학습) 전체",
  "나의성장방"
]'::jsonb
WHERE slug = 'light';

UPDATE public.plans
SET features = '[
  "가짜생각 분석기 7회/일",
  "생각쓰레기통 7회/일",
  "주 2회 1:1 코칭",
  "오늘의 루틴",
  "알고가기(학습) 전체",
  "나의성장방"
]'::jsonb
WHERE slug = 'pro';

UPDATE public.plans
SET features = '[
  "가짜생각 분석기 무제한/일",
  "생각쓰레기통 무제한/일",
  "행동연습장 무제한/일",
  "명상하기 무제한/일",
  "주 4회 1:1 코칭",
  "우선 고객 지원"
]'::jsonb
WHERE slug = 'premium';
