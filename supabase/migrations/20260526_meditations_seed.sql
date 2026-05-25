-- ─────────────────────────────────────────────────────────────
-- F83 — meditations 초기 시드 (코드 박힘 12개 그대로)
-- 출처: app/(auth)/meditation/page.tsx
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.meditations (slug, category, title, description, duration_seconds, audio_url, order_index)
VALUES
  ('guide-male-3min',  'person',  '남자 가이드 (3분)', '눈을 감고 편하게 앉은 뒤, 3분 동안 이 목소리만 따라가 주세요.',          180,
    'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/명상-가이드 남자.mp3', 1),
  ('guide-female-3min','person',  '여자 가이드 (3분)', '눈을 감고 편하게 앉은 뒤, 3분 동안 이 목소리만 따라가 주세요.',          180,
    'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/명상-가이드 여자.mp3', 2),
  ('nature-rain',      'nature',  '🌧 빗소리',         '자연의 소리를 들으며 호흡에만 집중해보세요.',                              300,
    'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Rain Heavy Loud.mp3', 1),
  ('nature-bonfire',   'nature',  '🔥 모닥불소리',     '자연의 소리를 들으며 호흡에만 집중해보세요.',                              300,
    'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Daytime Forest Bonfire.mp3', 2),
  ('nature-wave',      'nature',  '🌊 파도소리',       '자연의 소리를 들으며 호흡에만 집중해보세요.',                              300,
    'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Waves Crashing on Rock Beach.mp3', 3),
  ('nature-forest',    'nature',  '🌲 숲속 바람',      '자연의 소리를 들으며 호흡에만 집중해보세요.',                              300,
    'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Forest Wind Summer.mp3', 4),
  ('nature-birds',     'nature',  '🕊 산새소리',       '자연의 소리를 들으며 호흡에만 집중해보세요.',                              300,
    'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Spring Day Forest.mp3', 5),
  ('music-piano',      'music',   '🎹 잔잔한 피아노',  '눈을 감고 음악에만 귀를 기울여보세요.',                                    300,
    'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Sea of Memory - Aakash Gandhi.mp3', 1),
  ('music-harp',       'music',   '🎵 잔잔한 하프',    '눈을 감고 음악에만 귀를 기울여보세요.',                                    300,
    'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Wistful Harp - Andrew Huang.mp3', 2),
  ('music-guitar',     'music',   '🎻 잔잔한 기타',    '눈을 감고 음악에만 귀를 기울여보세요.',                                    300,
    'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Song of Sadhana - Jesse Gallagher.mp3', 3),
  ('music-bell',       'music',   '🔔 종 앰비언트',    '눈을 감고 음악에만 귀를 기울여보세요.',                                    300,
    'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/The House Glows (With Almost No Help) - Chris Zabriskie.mp3', 4),
  ('music-ambient',    'music',   '🌌 앰비언스',       '눈을 감고 음악에만 귀를 기울여보세요.',                                    300,
    'https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Wander - Emmit Fenn.mp3', 5)
ON CONFLICT (slug) DO NOTHING;
