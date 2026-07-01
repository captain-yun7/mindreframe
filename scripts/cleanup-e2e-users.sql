-- e2e 테스트 유저 정리 (Supabase SQL Editor 실행용)
-- 대상: 이메일이 e2e+*@mindreframe.local 인 유저 (e2e/helpers/auth.ts createTestUser 패턴)
-- 배경: deleteTestUser 가 auth.admin.deleteUser 만 호출 → public.users 고아 행 누적.
--       public.users → auth.users FK cascade 없음, 자식 테이블 대부분 ON DELETE CASCADE 없음.
--       따라서 자식 행을 순서대로 지운 뒤 users, auth.users 삭제.
--
-- 사용법:
--   1) [STEP 1] 프리뷰 블록만 먼저 실행해서 대상 유저 수/샘플 확인.
--   2) 확인되면 [STEP 2] 트랜잭션 블록 실행.

-- ─────────────────────────────────────────────────────────────
-- [STEP 1] 프리뷰 — 대상만 조회 (아무것도 삭제 안 함)
-- ─────────────────────────────────────────────────────────────
WITH targets AS (
  SELECT id, email FROM public.users WHERE email LIKE 'e2e+%@mindreframe.local'
  UNION
  SELECT id, email FROM auth.users   WHERE email LIKE 'e2e+%@mindreframe.local'
)
SELECT
  (SELECT count(*) FROM targets)                                                    AS target_count,
  (SELECT count(*) FROM public.users WHERE email LIKE 'e2e+%@mindreframe.local')    AS in_public_users,
  (SELECT count(*) FROM auth.users   WHERE email LIKE 'e2e+%@mindreframe.local')    AS in_auth_users;
-- 필요하면 목록 확인:
-- SELECT id, email FROM auth.users WHERE email LIKE 'e2e+%@mindreframe.local' ORDER BY created_at;


-- ─────────────────────────────────────────────────────────────
-- [STEP 2] 삭제 — 트랜잭션. 카운트가 예상과 다르면 ROLLBACK 하세요.
-- ─────────────────────────────────────────────────────────────
BEGIN;

CREATE TEMP TABLE _targets ON COMMIT DROP AS
  SELECT id FROM public.users WHERE email LIKE 'e2e+%@mindreframe.local'
  UNION
  SELECT id FROM auth.users   WHERE email LIKE 'e2e+%@mindreframe.local';

-- 안전장치: 대상 0명이면 중단(오탐 방지용 로그)
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM _targets;
  RAISE NOTICE 'e2e cleanup targets: %', n;
END $$;

-- ① 코치챗: e2e 유저가 sender 인 메시지 먼저 → 세션(메시지 cascade)
DELETE FROM public.coach_chat_messages WHERE sender_id IN (SELECT id FROM _targets);
DELETE FROM public.coach_chat_sessions WHERE user_id  IN (SELECT id FROM _targets);

-- ② 채팅 분석 → 세션(chat_messages·잔여 analyses cascade)
DELETE FROM public.chat_analyses WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.chat_sessions WHERE user_id IN (SELECT id FROM _targets);

-- ③ 결제/구독 (payments → subscriptions 순서). 타 유저 결제의 refunded_by=e2e 는 NULL 처리.
UPDATE public.payments SET refunded_by = NULL WHERE refunded_by IN (SELECT id FROM _targets);
DELETE FROM public.payments      WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.subscriptions WHERE user_id IN (SELECT id FROM _targets);

-- ④ 단순 user_id 자식 테이블
DELETE FROM public.notification_logs   WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.survey_responses    WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.emotion_scores      WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.routine_checks      WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.thought_records     WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.gratitude_entries   WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.study_progress      WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.exercise_logs       WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.meditation_logs     WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.user_badges         WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.ai_usage            WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.exercise_state      WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.coupon_redemptions  WHERE user_id IN (SELECT id FROM _targets);

-- ⑤ 어드민 작성 참조는 콘텐츠 보존 위해 NULL 처리 (e2e 유저가 admin 테스트에서 수정한 흔적)
UPDATE public.study_articles       SET updated_by = NULL WHERE updated_by IN (SELECT id FROM _targets);
UPDATE public.notification_videos  SET updated_by = NULL WHERE updated_by IN (SELECT id FROM _targets);
UPDATE public.notification_messages SET updated_by = NULL WHERE updated_by IN (SELECT id FROM _targets);
UPDATE public.site_settings        SET updated_by = NULL WHERE updated_by IN (SELECT id FROM _targets);
UPDATE public.meditations          SET updated_by = NULL WHERE updated_by IN (SELECT id FROM _targets);
UPDATE public.plans                SET updated_by = NULL WHERE updated_by IN (SELECT id FROM _targets);
UPDATE public.coupons              SET issued_by  = NULL WHERE issued_by  IN (SELECT id FROM _targets);

-- ⑥ 감사 로그: admin_user_id NOT NULL 이라 NULL 불가 → 대상 관련 행 삭제
DELETE FROM public.admin_audit_logs
  WHERE admin_user_id IN (SELECT id FROM _targets)
     OR target_user_id IN (SELECT id FROM _targets);

-- ⑦ 본체
DELETE FROM public.users WHERE id IN (SELECT id FROM _targets);
DELETE FROM auth.users   WHERE id IN (SELECT id FROM _targets);  -- auth.identities/sessions 는 auth 스키마 내부 cascade

-- 검증: 0 이어야 함
SELECT
  (SELECT count(*) FROM public.users WHERE email LIKE 'e2e+%@mindreframe.local') AS remain_public,
  (SELECT count(*) FROM auth.users   WHERE email LIKE 'e2e+%@mindreframe.local') AS remain_auth;

COMMIT;
