import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * 페이지 server component 가드용 — service role로 본인 row fetch.
 * createSupabaseServerClient(anon + 세션쿠키)는 RLS auth.uid()=id 매칭에 의존해
 * 세션 토큰 sync 실패 시 본인 row select 차단 → plan 인식 못함 → 잘못 차단.
 * 본 helper는 RLS 우회 보장.
 *
 * SERVICE_ROLE 키 없는 환경에서는 null 반환 (페이지에서 graceful 처리).
 */
export async function getUserProfileForGuard(userId: string): Promise<{
  plan: string | null;
  role: string | null;
  email: string | null;
  deleted_at: string | null;
} | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("plan, role, email, deleted_at")
      .eq("id", userId)
      .single();
    if (error) {
      console.error("[getUserProfileForGuard] fetch error:", error);
      return null;
    }
    return data as {
      plan: string | null;
      role: string | null;
      email: string | null;
      deleted_at: string | null;
    };
  } catch (err) {
    console.error("[getUserProfileForGuard] exception:", err);
    return null;
  }
}
