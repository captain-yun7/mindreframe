-- 익명 가입 테스트 유저 정리 (Supabase SQL Editor 실행용)
-- 대상: 닉네임 "테스트<base36>" + 이메일 <uuid>@oauth.local (e2e/signup.spec.ts 가 만드는 패턴)
-- 배경: signup 스펙의 cleanup이 auth.admin.deleteUser 만 호출 → public.users 고아 누적.
--       @oauth.local 은 실제 카카오/네이버 소셜 로그인 유저도 쓰는 도메인이라(app/(auth)/mypage/page.tsx),
--       이메일 단독이 아니라 "닉네임 정규식 AND @oauth.local" 교집합으로 안전하게 좁힌다.
--
-- 사용법:
--   1) [STEP 1] 프리뷰로 대상 수/목록 확인 (예상 ~59건, 데모 user@mindreframe.net 은 제외돼야 정상).
--   2) 맞으면 [STEP 2] 트랜잭션 실행. 카운트 이상하면 ROLLBACK.

-- 대상 정의(공통): 닉네임 = 테스트 + base36 5~10자, 이메일 @oauth.local, 관리자 아님
-- (regex ~ 는 PostgreSQL POSIX 정규식)

-- ─────────────────────────────────────────────────────────────
-- [STEP 1] 프리뷰
-- ─────────────────────────────────────────────────────────────
SELECT id, nickname, email, role, created_at
FROM public.users
WHERE nickname ~ '^테스트[0-9a-z]{5,10}$'
  AND email LIKE '%@oauth.local'
  AND coalesce(role, 'user') <> 'admin'
ORDER BY created_at DESC;


-- ─────────────────────────────────────────────────────────────
-- [STEP 2] 삭제 — 트랜잭션
-- ─────────────────────────────────────────────────────────────
BEGIN;

CREATE TEMP TABLE _targets ON COMMIT DROP AS
  SELECT id FROM public.users
  WHERE nickname ~ '^테스트[0-9a-z]{5,10}$'
    AND email LIKE '%@oauth.local'
    AND coalesce(role, 'user') <> 'admin';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM _targets;
  RAISE NOTICE 'signup test cleanup targets: %', n;
END $$;

-- ① 코치챗 (sender 먼저 → 세션이 메시지 cascade)
DELETE FROM public.coach_chat_messages WHERE sender_id IN (SELECT id FROM _targets);
DELETE FROM public.coach_chat_sessions WHERE user_id  IN (SELECT id FROM _targets);

-- ② 채팅 분석 → 세션
DELETE FROM public.chat_analyses WHERE user_id IN (SELECT id FROM _targets);
DELETE FROM public.chat_sessions WHERE user_id IN (SELECT id FROM _targets);

-- ③ 결제/구독
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

-- ⑤ 어드민 작성 참조는 콘텐츠 보존 위해 NULL 처리
UPDATE public.study_articles        SET updated_by = NULL WHERE updated_by IN (SELECT id FROM _targets);
UPDATE public.notification_videos   SET updated_by = NULL WHERE updated_by IN (SELECT id FROM _targets);
UPDATE public.notification_messages SET updated_by = NULL WHERE updated_by IN (SELECT id FROM _targets);
UPDATE public.site_settings         SET updated_by = NULL WHERE updated_by IN (SELECT id FROM _targets);
UPDATE public.meditations           SET updated_by = NULL WHERE updated_by IN (SELECT id FROM _targets);
UPDATE public.plans                 SET updated_by = NULL WHERE updated_by IN (SELECT id FROM _targets);
UPDATE public.coupons               SET issued_by  = NULL WHERE issued_by  IN (SELECT id FROM _targets);

-- ⑥ 감사 로그
DELETE FROM public.admin_audit_logs
  WHERE admin_user_id  IN (SELECT id FROM _targets)
     OR target_user_id IN (SELECT id FROM _targets);

-- ⑦ 본체
DELETE FROM public.users WHERE id IN (SELECT id FROM _targets);
DELETE FROM auth.users   WHERE id IN (SELECT id FROM _targets);

-- 검증: 0 이어야 함
SELECT count(*) AS remain
FROM public.users
WHERE nickname ~ '^테스트[0-9a-z]{5,10}$'
  AND email LIKE '%@oauth.local'
  AND coalesce(role, 'user') <> 'admin';

COMMIT;
