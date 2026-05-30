-- F154 일괄 read 처리
-- read_at 도입 이전에 누적된 모든 메시지를 "읽음"으로 마킹.
-- 헤더 안 읽음 배지 초기화 목적. 새 메시지부터 정상 카운트.
--
-- 안전: read_at IS NULL인 row만 업데이트. 재실행해도 영향 없음.

UPDATE public.coach_chat_messages
SET read_at = now()
WHERE read_at IS NULL;
