-- ─────────────────────────────────────────────────────────────
-- 콘텐츠 테이블 시드 데이터
-- /meditation, /exercise, /study 페이지의 콘텐츠를 DB에 적재.
-- 페이지 코드는 추후 이 데이터를 SELECT해서 사용 (현재는 하드코딩).
-- ─────────────────────────────────────────────────────────────

-- ─── meditation_tracks ───
INSERT INTO public.meditation_tracks (title, category, audio_url, duration, sort_order)
VALUES
  ('남자 가이드 (3분)', 'person', 'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/명상-가이드 남자.mp3', 180, 1),
  ('여자 가이드 (3분)', 'person', 'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/명상-가이드 여자.mp3', 180, 2),
  ('빗소리', 'nature', 'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Rain Heavy Loud.mp3', 300, 1),
  ('모닥불소리', 'nature', 'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Daytime Forest Bonfire.mp3', 300, 2),
  ('파도소리', 'nature', 'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Waves Crashing on Rock Beach.mp3', 300, 3),
  ('숲속 바람', 'nature', 'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Forest Wind Summer.mp3', 300, 4),
  ('산새소리', 'nature', 'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Spring Day Forest.mp3', 300, 5),
  ('잔잔한 피아노', 'music', 'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Sea of Memory - Aakash Gandhi.mp3', 300, 1),
  ('잔잔한 하프', 'music', 'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Wistful Harp - Andrew Huang.mp3', 300, 2),
  ('잔잔한 기타', 'music', 'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Song of Sadhana - Jesse Gallagher.mp3', 300, 3),
  ('종 앰비언트', 'music', 'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/The House Glows (With Almost No Help) - Chris Zabriskie.mp3', 300, 4),
  ('앰비언스', 'music', 'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Wander - Emmit Fenn.mp3', 300, 5)
ON CONFLICT DO NOTHING;

-- ─── exercises (행동연습장) — 페이지 콘텐츠 분석 후 보강 필요 ───
INSERT INTO public.exercises (title, description, category, difficulty, sort_order)
VALUES
  ('1분 산책', '집 앞 또는 사무실 근처를 천천히 1분간 걷기', 'behavior', 1, 1),
  ('한 사람에게 안부 묻기', '오늘 떠오른 사람에게 짧은 메시지 보내기', 'social', 2, 2),
  ('미루던 메일 1개 답장', '5분 안에 답할 수 있는 메일 1개 처리', 'task', 2, 3),
  ('하루 1잔 물 추가로 마시기', '의식적으로 물 한 잔', 'self-care', 1, 4),
  ('30초 스트레칭', '어깨, 목, 허리를 돌려보기', 'self-care', 1, 5),
  ('좋아하는 노래 1곡 듣기', '오롯이 그 곡에만 집중', 'pleasure', 1, 6)
ON CONFLICT DO NOTHING;

-- ─── study_contents (알고가기) — 페이지 콘텐츠 분석 후 보강 필요 ───
-- 임시 시드, /study 페이지 진입 시 반드시 1개 이상 필요
INSERT INTO public.study_contents (slug, title, category, day_number, content, sort_order)
VALUES
  ('day-1-cognitive-distortions', '인지왜곡이란?', 'cbt-basics', 1,
    '우리 뇌는 빠르게 판단하기 위해 종종 사실을 왜곡합니다. 흑백사고, 파국화, 독심술 등이 대표적인 인지왜곡입니다.',
    1),
  ('day-2-thought-record', '생각 기록법', 'cbt-basics', 2,
    '상황 → 생각 → 감정 → 신체반응 → 행동 순서로 분리해보면, 생각과 나를 분리할 수 있습니다.',
    2),
  ('day-3-evidence-check', '증거 점검', 'cbt-basics', 3,
    '"그 생각이 사실이라는 증거가 있나요?" 라는 질문은 자동사고를 검증하는 첫걸음입니다.',
    3)
ON CONFLICT (slug) DO NOTHING;

-- ─── badges 정의 시드 ───
INSERT INTO public.badges (key, title, description, icon, condition)
VALUES
  ('first_analysis', '첫 시작', '첫 가짜생각 분석 완료', '🌱', '{"type":"analyses_count","gte":1}'::jsonb),
  ('streak_3', '3일 연속', '3일 연속 루틴 완료', '🔥', '{"type":"streak","gte":3}'::jsonb),
  ('streak_7', '7일 연속', '7일 연속 루틴 완료', '⭐', '{"type":"streak","gte":7}'::jsonb),
  ('total_30', '30일 돌파', '30일 누적 기록', '🏆', '{"type":"total_days","gte":30}'::jsonb),
  ('alternatives_10', '사고 전환', '대안사고 10개 달성', '💡', '{"type":"alternatives","gte":10}'::jsonb),
  ('meditation_20', '명상 마스터', '명상 20회 달성', '🧘', '{"type":"meditation","gte":20}'::jsonb),
  ('gratitude_30', '기록왕', '감사일기 30개 달성', '📝', '{"type":"gratitude","gte":30}'::jsonb),
  ('total_100', '100일 완주', '100일 프로그램 완주', '🎯', '{"type":"total_days","gte":100}'::jsonb)
ON CONFLICT (key) DO NOTHING;
