-- ─────────────────────────────────────────────────────────────
-- F89 — 푸터/약관/방침 어드민 편집을 위한 site_settings 테이블
-- key-value 형태로 사이트 전역 설정 보관
-- 회사 주소(footer_address)는 자리만 만들고 값 변경은 사용자 결정 후 (Sprint C 보류)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_settings (
  key varchar(80) PRIMARY KEY,
  value text NOT NULL,
  description varchar(200),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read" ON public.site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_settings_admin_write" ON public.site_settings;
CREATE POLICY "site_settings_admin_write" ON public.site_settings
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- updated_at 자동 갱신 공용 트리거 함수 (Sprint C 마이그레이션 전체가 공유)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_settings_touch ON public.site_settings;
CREATE TRIGGER site_settings_touch
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
