-- F230 — 명상하기 인트로 팝업 카피 seed (popup_meditation_intro)
-- /meditation 진입 시 GamePopup으로 1회 노출 (storage dismissed 패턴).

INSERT INTO public.site_settings (key, value, description) VALUES
  (
    'popup_meditation_intro',
    '{"title":"명상은 초점을 이동하는 훈련이에요","body":"사람의 가이드 음성으로 명상하기를 시작하세요.\n명상의 방법을 안내합니다.\n\n명상 훈련을 시작하시겠습니까?","cta":"명상하기"}',
    'F230 명상 인트로 팝업 (메인 진입 시 1회)'
  )
ON CONFLICT (key) DO NOTHING;
