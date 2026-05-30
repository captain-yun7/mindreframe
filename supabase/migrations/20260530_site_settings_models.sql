-- F216 — 어드민 AI 모델 선택 (site_settings.model_*)
-- 3개 단계별로 모델 분리. 빈값일 때는 코드 default 사용.
--
-- 추천 매핑 (코드 default):
--   model_analyzer → gpt-4.1     (1단계 JSON 분석, 안정적)
--   model_therapy  → gpt-4o-mini (분석기 치료·마무리, 빠름·저렴)
--   model_trash    → gpt-4o-mini (생각쓰레기통, 대표님 명시)

INSERT INTO public.site_settings (key, value, description) VALUES
  ('model_analyzer', '', 'F216 1단계 분석 모델. 빈값=코드 default(gpt-4.1)'),
  ('model_therapy',  '', 'F216 분석기 치료·마무리 모델. 빈값=코드 default(gpt-4o-mini)'),
  ('model_trash',    '', 'F216 생각쓰레기통 모델. 빈값=코드 default(gpt-4o-mini)')
ON CONFLICT (key) DO NOTHING;
