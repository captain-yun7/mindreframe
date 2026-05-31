-- F249 — 어드민 max_tokens 설정
-- 기본값은 원본 토닥챗 5/31 로컬 테스트와 동일:
--   max_tokens_analyzer : 1000 (1단계 분석)
--   max_tokens_therapy  : 2000 (치료 시작/진행/마무리)
--   max_tokens_trash    : 2000 (생각쓰레기통)
-- 빈값이면 코드 default (위 숫자) 사용. '0'이면 무제한 (전달 안 함).

INSERT INTO public.site_settings (key, value, description) VALUES
  ('max_tokens_analyzer', '', 'F249 1단계 분석 max_tokens. 빈값=1000, 0=무제한'),
  ('max_tokens_therapy',  '', 'F249 치료/마무리 max_tokens. 빈값=2000, 0=무제한'),
  ('max_tokens_trash',    '', 'F249 생각쓰레기통 max_tokens. 빈값=2000, 0=무제한')
ON CONFLICT (key) DO NOTHING;
