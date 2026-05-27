-- H6/F122: 랜딩 분석기 비로그인 사용 추적 + abuse 차단
--
-- - anonymous_id: client에서 crypto.randomUUID() 생성, localStorage에 보관
-- - client_ip: Vercel request.ip
-- - content_hash: 입력 텍스트 SHA256 (재시도 중복 차단)
-- - 일일 cap: server action에서 같은 IP/UUID 1회만 허용
--
-- RLS: 익명/유저 모두 SELECT/INSERT 차단. service_role(server action)만 접근.

CREATE TABLE IF NOT EXISTS public.landing_analyzer_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id uuid NOT NULL,
  client_ip inet,
  content_hash text,
  result jsonb,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_analyzer_anon
  ON public.landing_analyzer_usage(anonymous_id, used_at);
CREATE INDEX IF NOT EXISTS idx_landing_analyzer_ip
  ON public.landing_analyzer_usage(client_ip, used_at);

ALTER TABLE public.landing_analyzer_usage ENABLE ROW LEVEL SECURITY;
-- 명시적 정책 없음 → 익명/유저 SELECT/INSERT 모두 차단
-- service role(server action)만 SELECT/INSERT
