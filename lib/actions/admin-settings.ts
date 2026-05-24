"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function ensureAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };
  const { data: u } = await sb.from("users").select("role").eq("id", user.id).single();
  if (u?.role !== "admin") return { ok: false, error: "관리자 권한이 필요합니다" };
  return { ok: true, userId: user.id };
}

// Sprint C에서 편집 차단되는 키 (회사 주소 등 사용자 결정 대기)
const READONLY_KEYS = new Set<string>(["footer_address"]);
const VALID_KEY_RE = /^[a-z_][a-z0-9_]*$/;

export async function adminUpdateSiteSetting(key: string, value: string) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  if (!key || !VALID_KEY_RE.test(key) || key.length > 80) {
    return { ok: false as const, error: "key 형식 오류 (소문자/숫자/_)" };
  }
  if (READONLY_KEYS.has(key)) {
    return { ok: false as const, error: "이 항목은 현재 변경 보류 중입니다" };
  }
  if (typeof value !== "string") return { ok: false as const, error: "value 타입 오류" };
  if (value.length > 200_000) return { ok: false as const, error: "값은 200,000자 이내" };

  const { error } = await supabaseAdmin.from("site_settings").upsert({
    key,
    value,
    updated_by: guard.userId,
  });
  if (error) return { ok: false as const, error: error.message };

  // SiteFooter는 모든 page의 layout에 포함되므로 layout 전체 revalidate
  revalidatePath("/admin/settings");
  revalidatePath("/terms");
  revalidatePath("/privacy");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
