-- H2: ai_usage에 feature 컬럼 추가, UNIQUE 재구성
-- (user_id, used_at, feature) 단위로 카운팅 — 분석기/쓰레기통 별도 한도 적용
--
-- 마이그레이션 전략:
--   1) feature 컬럼 추가 (default 'analyzer' — 기존 row는 분석기 사용량으로 backfill)
--   2) 기존 UNIQUE index 제거 후 신규 (user_id, used_at, feature) UNIQUE 생성
--
-- 운영자 노트: 기존 row를 모두 'analyzer'로 간주하므로, 본 마이그 직후 라이트/프로 사용자가
-- 이미 일일 한도까지 분석기 사용으로 기록될 수 있음. 사용자 영향이 큰 경우 별도 reset 운영.

ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS feature text NOT NULL DEFAULT 'analyzer';

-- 기존 unique 제거 + 새 unique
DROP INDEX IF EXISTS uq_ai_usage_user_date;
DROP INDEX IF EXISTS public.uq_ai_usage_user_date;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_usage_user_date_feature
  ON public.ai_usage(user_id, used_at, feature);

COMMENT ON COLUMN public.ai_usage.feature IS
  'H2: 카운팅 단위 — analyzer (가짜생각 분석기 finalize) / trash (쓰레기통 JSON 추출)';
