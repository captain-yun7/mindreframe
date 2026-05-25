-- ─────────────────────────────────────────────────────────────
-- F81 (b) — 100일 알림용 3분 영상 100개 테이블
-- F86 notification_messages와 1:1 day_number 매칭
-- 현재는 placeholder 행만 생성 (영상 자산 수령 후 admin UI로 채움)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_videos (
  day_number integer PRIMARY KEY CHECK (day_number BETWEEN 1 AND 100),
  title varchar(200) NOT NULL,
  description text,
  video_id varchar(80), -- Cloudflare Stream UID
  duration_seconds integer, -- 영상 길이 메타 (기본 180=3분 추정)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id)
);

ALTER TABLE public.notification_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_videos_public_read" ON public.notification_videos;
CREATE POLICY "notification_videos_public_read" ON public.notification_videos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "notification_videos_admin_write" ON public.notification_videos;
CREATE POLICY "notification_videos_admin_write" ON public.notification_videos
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- touch_updated_at trigger (다른 마이그레이션에서 이미 등록됐다면 OR REPLACE로 안전)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_videos_touch ON public.notification_videos;
CREATE TRIGGER notification_videos_touch
  BEFORE UPDATE ON public.notification_videos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 1~100 placeholder 행
INSERT INTO public.notification_videos (day_number, title)
SELECT n, format('%s일차 영상 (제목 미설정)', n)
FROM generate_series(1, 100) AS n
ON CONFLICT (day_number) DO NOTHING;
