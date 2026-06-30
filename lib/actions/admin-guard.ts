import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ADMIN_EMAIL_WHITELIST } from "@/lib/auth/plan";

/**
 * server action용 관리자 가드 (공유). 신규 admin-* 액션 파일에서 재사용.
 * 기존 파일은 각자 내부 ensureAdmin을 유지하되, 신규 코드는 이 헬퍼를 사용한다.
 *
 * 반환: { ok:true, userId } | { ok:false, error }
 */
export async function ensureAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };
  if (user.email && ADMIN_EMAIL_WHITELIST.includes(user.email)) {
    return { ok: true, userId: user.id };
  }
  const { data: u } = await sb
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if ((u as { role?: string } | null)?.role !== "admin") {
    return { ok: false, error: "관리자 권한이 필요합니다" };
  }
  return { ok: true, userId: user.id };
}
