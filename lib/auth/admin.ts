import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ADMIN_EMAIL_WHITELIST } from "@/lib/auth/plan";

/**
 * 운영자 이메일 화이트리스트 — 세션 토큰·RLS 이슈와 무관하게 admin 인식 보장.
 * DB의 role='admin'과 별개의 안전망.
 *
 * `lib/auth/plan.ts`의 `ADMIN_EMAIL_WHITELIST`를 단일 출처로 사용. 새 운영자 추가는
 * 그쪽 한 군데만 수정하면 page 가드 / server action 한도 면제까지 모두 자동 반영.
 */
const ADMIN_EMAILS = ADMIN_EMAIL_WHITELIST;

/**
 * 관리자 권한 가드 (server component / server action 공용).
 * 미인증 → /login, 권한 없음 → /
 */
export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 이메일 화이트리스트 1차 통과
  if (user.email && ADMIN_EMAILS.includes(user.email)) {
    return { supabase, user };
  }

  const { data: u } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (u?.role !== "admin") {
    redirect("/");
  }

  return { supabase, user };
}

/**
 * 코치 또는 관리자 권한 가드 (server component 공용).
 * F82 행동연습장 열람 등 coach role도 사용해야 하는 페이지에서 사용.
 * 미인증 → /login, 권한 없음 → /
 */
export async function requireCoachOrAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 운영자 이메일 화이트리스트는 admin으로 즉시 통과
  if (user.email && ADMIN_EMAILS.includes(user.email)) {
    return { supabase, user, role: "admin" };
  }

  const { data: u } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (u as { role?: string } | null)?.role;
  if (role !== "coach" && role !== "admin") {
    redirect("/");
  }

  return { supabase, user, role };
}
