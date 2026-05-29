-- J3 / F144 — 분석기 프롬프트 site_settings로 이동
-- 4개 prompt를 site_settings에 빈 string seed. 빈 값일 때 코드 fallback 사용.
--
-- 키:
--   prompt_analyzer_main       — ANALYSIS_PROMPT (1단계)
--   prompt_analyzer_therapy    — buildTherapyPrompt 본문 템플릿 (3단계, placeholder 포함)
--   prompt_analyzer_finalize   — FINALIZE_PROMPT_KO (4단계)
--   prompt_trash_main          — TRASH_SYSTEM_PROMPT (생각쓰레기통)

INSERT INTO public.site_settings (key, value, description) VALUES
  ('prompt_analyzer_main', '', 'F144 분석기 1단계. 빈값=코드 fallback'),
  ('prompt_analyzer_therapy', '', 'F144 분석기 3단계 템플릿. 빈값=코드 fallback. {{situation}}/{{automatic_thought}}/{{emotion_name}}/{{emotion_intensity}}/{{distortion}}/{{goal}}/{{advice}}/{{warning}}'),
  ('prompt_analyzer_finalize', '', 'F144 분석기 4단계 마무리 JSON. 빈값=코드 fallback'),
  ('prompt_trash_main', '', 'F144 생각쓰레기통 시스템 프롬프트. 빈값=코드 fallback')
ON CONFLICT (key) DO NOTHING;
