-- F75 — 소셜 로그인 닉네임 1회 입력 정책
-- 사용자가 명시적으로 닉네임을 "설정 완료"한 시점을 표시한다.
-- 신규 가입자는 false로 시작하여 /onboarding/nickname에서 직접 입력해야 set.
-- 기존 사용자는 이탈 방지를 위해 모두 true로 백필 (메인 에이전트 결정).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS nickname_set boolean NOT NULL DEFAULT false;

UPDATE public.users
SET nickname_set = true
WHERE nickname_set = false;
