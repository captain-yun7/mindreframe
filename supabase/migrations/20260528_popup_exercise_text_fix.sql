-- F135 — 행동연습장 step1/2/3 팝업 문구 3차 피드백 명세 반영
-- 기존 20260527_site_settings_h3.sql 의 seed 는 ON CONFLICT DO NOTHING — 이미 INSERT 된 row 에 적용 안 됨.
-- 본 마이그는 정제된 문구로 강제 UPDATE.
--
-- site_settings.value(text) 컬럼에 JSON 문자열로 저장. 클라이언트가 JSON.parse 로 활용.

UPDATE public.site_settings
SET value = $${"title":"용기 한 걸음 🎯","body":"어떤 연습을 할까요?\n\n• 불안 줄이기 — 피해왔던 상황을 단계적으로 도전해요\n• 우울 벗어나기 — 작은 행동이 기분을 깨워요\n\n오늘은 한 걸음이면 충분해요.","cta":"시작하기"}$$,
    updated_at = now()
WHERE key = 'popup_exercise_step1';

UPDATE public.site_settings
SET value = $${"title":"2단계 — 목록 만들기","body":"두렵거나 피해왔던 상황(또는 작은 활동) 5~10개를 적어요.\n\n• 너무 어렵지 않은 것부터\n• 자동/합리적 사고는 나중에 채워도 OK\n• 5개 이상 채우면 3단계가 자동으로 열려요\n\n작성 중 자동 저장됩니다.","cta":"적어볼게요"}$$,
    updated_at = now()
WHERE key = 'popup_exercise_step2';

UPDATE public.site_settings
SET value = $${"title":"3단계 — 오늘의 도전 1개 선택","body":"2단계 목록에서 라디오를 체크하면 여기에 표시돼요.\n\n• 가장 쉬운 것부터 시작 (피한 순위가 낮은 것)\n• \"완벽\"이 아니라 \"한 걸음\"이 목표\n• 떨려도 괜찮아요 — 떨면서 해내는 게 진짜 용기","cta":"고를게요"}$$,
    updated_at = now()
WHERE key = 'popup_exercise_step3';
