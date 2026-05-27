-- H3: 사이트 설정 17개 키 추가 (랜딩·대시보드·페이지 hero subtitle · 팝업 콘텐츠)
-- 모든 키는 INSERT ... ON CONFLICT (key) DO NOTHING — 기존 운영자 변경값 보존

INSERT INTO public.site_settings (key, value, description) VALUES
  (
    'landing_hero_title',
    E'우울·불안은 <gold>생각습관</gold>이에요.\n훈련으로만 바뀝니다 🌱',
    '랜딩 hero h1 (HTML 안전: <gold> 태그만 허용)'
  ),
  (
    'landing_hero_subtitle',
    E'반복되는 ''가짜생각''을 하루 20분, 쉽고 짧게.\n100일이면 분명히 달라져요.',
    '랜딩 hero subtitle'
  ),
  (
    'landing_menu_items',
    $$[{"emoji":"💭","title":"가짜생각 분석기","description":"생각 한 줄만 적으면 인지왜곡, 대안사고까지 전부 찾아드려요.","href":"/chat"},{"emoji":"🗑️","title":"생각쓰레기통","description":"여기에 생각을 버리고, 뭉친 마음의 실타래를 푸세요!","href":"/trash"},{"emoji":"🌙","title":"명상하기","description":"초점 이동, 짧고 가볍게 매일.","href":"/meditation"},{"emoji":"🎯","title":"행동연습장","description":"불안 줄이기 연습, 우울 벗어나기 연습. 작은 용기를 쌓으세요.","href":"/exercise"},{"emoji":"🤝","title":"코치 채팅","description":"가짜 생각 코치와 100일을 시작하세요.","href":"/coach"},{"emoji":"🌱","title":"나의 성장방","description":"오늘의 기록이 쌓여 100일의 변화로. 한눈에 확인하세요.","href":"/progress"}]$$,
    '랜딩 6개 메뉴 (JSON 배열)'
  ),
  (
    'landing_stats',
    $$[{"value":"10+","label":"함께한 사람들"},{"value":"500+","label":"분석된 생각"},{"value":"100일","label":"훈련 프로그램"}]$$,
    '랜딩 stats 숫자 (JSON 배열)'
  ),
  (
    'landing_final_cta',
    $${"title":"오늘 시작해보세요 🌱","subtitle":"하루 20분, 100일이면 분명히 달라져요.\n완벽보다 시작이 중요해요."}$$,
    '랜딩 최종 CTA 카피 (JSON 객체)'
  ),
  (
    'dashboard_hero_subtitle',
    '작은 한 걸음이 큰 변화로 이어져요. 오늘도 1%만 해도 충분해요.',
    '대시보드 hero subtitle'
  ),
  (
    'trash_hero_subtitle',
    '불안하거나 화가 났던 한 사건을 전부 쏟아놓으세요. 생각쓰레기통이 알아서 상황·생각·감정·신체반응·행동을 나눠줄게요.',
    '쓰레기통 hero subtitle'
  ),
  (
    'progress_hero_subtitle',
    '기록은 거짓말하지 않아요. 오늘까지 함께한 흔적을 확인해보세요.',
    '성장방 hero subtitle'
  ),
  (
    'chat_hero_subtitle',
    '지금 떠오른 그 생각, 정말 사실일까요? 11가지 인지왜곡 패턴을 함께 찾고 합리적인 대안사고를 만들어 드려요.',
    '분석기 hero subtitle'
  ),
  (
    'exercise_hero_subtitle',
    '작은 행동 하나가 가장 강력한 무기예요. 계획 → 선택 → 도전 → 기록으로 한 걸음씩.',
    '행동연습장 hero subtitle'
  ),
  (
    'meditation_hero_subtitle',
    '하루 3분, 한 곳에 초점을 두면 마음이 차분해져요.',
    '명상 hero subtitle'
  ),
  (
    'popup_trash_intro',
    $${"title":"왜 생각을 나눌까요?","body":"생각쓰레기통의 목적은 생각을 없애는 것이 아니라 생각과 나를 분리하는 거예요.\n\n떠오른 자동사고를 글로 적으면, 그 생각은 더 이상 '나'가 아니라 밖에 놓인 한 줄이 됩니다.\n\nAI 코치가 상황·생각·감정·몸·행동을 차례로 물어줄게요.","cta":"시작하기"}$$,
    '쓰레기통 첫 진입 팝업 (JSON)'
  ),
  (
    'popup_chat_intro',
    $${"title":"가짜생각 분석기 사용법","body":"① 생각쓰레기통에서 찾은 생각을 쓰거나, 떠오른 자동사고와 감정점수(0~100)를 적으세요.\n② 분석기가 인지왜곡을 찾아 질문하면 따라가 주세요.\n③ 객관적으로 거리를 두고, 탐정이 된 듯 답해봅니다.\n④ 합리적 사고를 함께 찾아요!\n⑤ 합리적 사고를 외우고 상황에 적용해요. 꼭이요!","cta":"시작하기"}$$,
    '분석기 첫 진입 팝업 (JSON)'
  ),
  (
    'popup_meditation_focus',
    $${"title":"잠시 쉬어가요 🌙","body":"① 원하는 것을 하나 선택해 보세요. 소리, 호흡, 손에 닿는 물의 감각... 하나면 충분합니다.\n② 선택한 곳에 잠시 초점을 두어봅니다. 잘하려고 애쓰지 않아도 괜찮습니다.\n③ 중간에 초점이 흩어져도 괜찮습니다. 알아차렸다면, 다시 원하는 곳으로 돌아오면 됩니다.\n\n최소 3분 이상 해봐요!","cta":"오늘 시작하기"}$$,
    '명상 초점 이동 훈련 가이드 (JSON)'
  ),
  (
    'popup_exercise_step1',
    $${"title":"용기 한 걸음 🎯","body":"어떤 연습을 할까요?\n\n불안 줄이기 — 피해왔던 상황을 단계적으로 도전\n우울 벗어나기 — 작은 행동이 기분을 깨워요","cta":"시작하기"}$$,
    '행동연습장 1단계 진입 팝업 (JSON)'
  ),
  (
    'popup_exercise_step2',
    $${"title":"2단계 — 목록 만들기","body":"두렵거나 피해왔던 상황 10개를 적고, 피한 순위를 매겨주세요. 자동/합리적 사고는 나중에 채워도 돼요.\n\n작성 중 자동 저장됩니다.","cta":"네, 적어볼게요"}$$,
    '2단계 안내 팝업 (JSON)'
  ),
  (
    'popup_exercise_step3',
    $${"title":"3단계 — 오늘의 도전 선택","body":"표에서 라디오를 체크하면 여기 표시됩니다. 너무 어려운 단계부터 시작하지 말고, 피한 순위가 낮은 것부터.","cta":"고를게요"}$$,
    '3단계 시작 팝업 (JSON)'
  ),
  (
    'popup_exercise_step4_praise',
    $${"title":"용기 레벨 1 획득 🏆","body":"오늘 한 걸음을 내디뎠어요.\n\n결과가 아쉬워도, 시도한 사실 자체가 성장이에요. 이 기록은 평생 남아요.","cta":"성장방에서 확인하기"}$$,
    '4단계 칭찬 팝업 (JSON)'
  )
ON CONFLICT (key) DO NOTHING;
