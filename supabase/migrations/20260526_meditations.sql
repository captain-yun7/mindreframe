-- ─────────────────────────────────────────────────────────────
-- F83 — 명상 콘텐츠 DB 이전
-- 기존: app/(auth)/meditation/page.tsx 코드 박힘 12개
-- 신규: meditations 테이블 + admin CRUD
-- 폐기: meditation_tracks (사용처 없음, seed만 있음)
-- ─────────────────────────────────────────────────────────────

-- 기존 meditation_tracks 폐기
-- meditation_logs.track_id는 5/2 logs_nullable_fk 마이그레이션에서 nullable + track_slug로 대체됨
ALTER TABLE public.meditation_logs DROP CONSTRAINT IF EXISTS meditation_logs_track_id_fkey;
DROP TABLE IF EXISTS public.meditation_tracks CASCADE;

CREATE TABLE IF NOT EXISTS public.meditations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(80) UNIQUE NOT NULL,
  category varchar(30) NOT NULL, -- 'person' | 'nature' | 'music'
  title varchar(200) NOT NULL,
  description text,
  duration_seconds integer NOT NULL DEFAULT 180,
  audio_url text,
  video_id varchar(80), -- Cloudflare Stream UID (옵션, 차후 영상 명상 지원)
  order_index integer NOT NULL DEFAULT 0,
  required_plan varchar(20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_meditations_category_order
  ON public.meditations(category, order_index);

ALTER TABLE public.meditations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meditations_public_read" ON public.meditations;
CREATE POLICY "meditations_public_read" ON public.meditations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "meditations_admin_write" ON public.meditations;
CREATE POLICY "meditations_admin_write" ON public.meditations
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS meditations_touch ON public.meditations;
CREATE TRIGGER meditations_touch
  BEFORE UPDATE ON public.meditations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
