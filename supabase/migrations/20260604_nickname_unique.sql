-- F255 — 닉네임 중복 방지
-- nickname_set = true 인 사용자끼리만 nickname 유일성 강제 (부분 unique 인덱스).
-- 빈 닉네임("") / 미설정(nickname_set=false)은 제외 — OAuth 가입 직후 빈 값 다수 허용.
-- 대소문자·앞뒤공백 무시 매칭을 위해 lower(trim()) 기준.

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_nickname_active
  ON public.users (lower(trim(nickname)))
  WHERE nickname_set = true AND trim(nickname) <> '';
