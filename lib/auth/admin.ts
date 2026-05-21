import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * 관리자 권한 가드 (server component / server action 공용).
 * 미인증 → /login, 권한 없음 → /
 */
export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
