-- 카카오 재로그인/프로필 갱신 시 사용자가 정한 별명이
-- 카카오 실명(full_name)으로 롤백되던 문제 수정.
-- nickname_set=true(온보딩에서 별명 확정)면 nickname을 덮어쓰지 않는다.

CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users SET
    email = COALESCE(NEW.email, email),
    nickname = CASE
      WHEN nickname_set THEN nickname
      ELSE COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'name',
        NEW.raw_user_meta_data ->> 'nickname',
        nickname
      )
    END,
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
