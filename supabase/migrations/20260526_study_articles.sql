-- ─────────────────────────────────────────────────────────────
-- F81 — 알고가기 콘텐츠 DB 이전
-- 기존: lib/study-content.ts 코드 박힘 25개 (필수 8 + 더 많이 17)
-- 신규: study_articles 테이블 + admin CRUD
-- 폐기: study_contents (사용처 없음, 5/1 임시 시드 3개만 있음)
-- ─────────────────────────────────────────────────────────────

-- 기존 study_contents 폐기
-- study_progress.study_content_id FK는 5/2 logs_nullable_fk 마이그레이션에서 nullable + content_slug text로 대체됨
DROP TABLE IF EXISTS public.study_contents CASCADE;

CREATE TABLE IF NOT EXISTS public.study_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(80) UNIQUE NOT NULL,
  category varchar(30) NOT NULL, -- 'core' | 'distortion' | 'body' | 'avoidance' | 'rumination'
  title varchar(200) NOT NULL,
  sub varchar(300),
  body_html text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  video_id varchar(80), -- Cloudflare Stream UID (차후)
  required_plan varchar(20), -- NULL=전체 공개, 'pro'=프로 이상 (영상 게이트)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_study_articles_category_order
  ON public.study_articles(category, order_index);
CREATE INDEX IF NOT EXISTS idx_study_articles_slug
  ON public.study_articles(slug);

ALTER TABLE public.study_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_articles_public_read" ON public.study_articles;
CREATE POLICY "study_articles_public_read" ON public.study_articles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "study_articles_admin_write" ON public.study_articles;
CREATE POLICY "study_articles_admin_write" ON public.study_articles
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- touch_updated_at trigger (F86/F89에서 이미 등록됐다면 OR REPLACE로 안전)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS study_articles_touch ON public.study_articles;
CREATE TRIGGER study_articles_touch
  BEFORE UPDATE ON public.study_articles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
