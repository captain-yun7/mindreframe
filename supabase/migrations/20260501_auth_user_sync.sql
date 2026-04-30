-- ─────────────────────────────────────────────────────────────
-- auth.users ↔ public.users 동기화
--
-- Supabase Auth(외부 인증)의 사용자가 가입/수정될 때
-- public.users 테이블에 자동으로 행을 생성/업데이트한다.
--
-- public.users.id = auth.users.id 로 1:1 매핑.
-- ─────────────────────────────────────────────────────────────

-- ─── public.users 보강 ───
-- 기존 schema.ts에 정의된 컬럼은 유지하고, password_hash는 nullable이어야 한다 (OAuth 사용자는 비밀번호 없음).
-- nickname은 NOT NULL이지만 OAuth 가입 직후엔 빈 값일 수 있으므로 빈 문자열 default로 안전망.
ALTER TABLE public.users ALTER COLUMN nickname SET DEFAULT '';

-- email 유니크 제약 유지를 위해 OAuth 사용자가 email 없을 때를 대비
-- (네이버는 이메일 줌, 카카오는 비즈 앱 후에만 줌)
-- email이 NULL이면 안 되므로 placeholder를 넣는다: `<auth_id>@oauth.local`
-- 진짜 이메일은 metadata에서 가져와 갱신.

-- ─── insert 트리거: auth.users 생성 시 public.users 자동 삽입 ───
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    nickname,
    profile_image,
    provider,
    provider_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.id::text || '@oauth.local'),
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'nickname',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture',
      NEW.raw_user_meta_data ->> 'profile_image'
    ),
    COALESCE(NEW.raw_app_meta_data ->> 'provider', 'email'),
    NEW.raw_user_meta_data ->> 'provider_id',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ─── update 트리거: auth.users metadata 변경 시 public.users 갱신 ───
CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users SET
    email = COALESCE(NEW.email, email),
    nickname = COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'nickname',
      nickname
    ),
    profile_image = COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture',
      NEW.raw_user_meta_data ->> 'profile_image',
      profile_image
    ),
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_updated();

-- ─── 기존 auth.users → public.users 백필 (이미 OAuth 가입한 사용자 매핑) ───
INSERT INTO public.users (id, email, nickname, profile_image, provider, created_at, updated_at)
SELECT
  u.id,
  COALESCE(u.email, u.id::text || '@oauth.local'),
  COALESCE(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    u.raw_user_meta_data ->> 'nickname',
    split_part(COALESCE(u.email, ''), '@', 1),
    ''
  ),
  COALESCE(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  ),
  COALESCE(u.raw_app_meta_data ->> 'provider', 'email'),
  u.created_at,
  u.updated_at
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
