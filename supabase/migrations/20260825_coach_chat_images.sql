-- 코치 채팅 사진 전송 (2026-08-25 고객 요청)
-- 이미지는 R2에 저장하고 메시지에는 객체 키만 기록.
alter table public.coach_chat_messages add column if not exists image_key text;
