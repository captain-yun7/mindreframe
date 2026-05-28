"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { writeAudit } from "./_audit";

async function ensureAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };
  if (user.email === "mindtheater00@gmail.com") return { ok: true, userId: user.id };
  const { data: u } = await sb.from("users").select("role").eq("id", user.id).single();
  if ((u as { role?: string } | null)?.role !== "admin") {
    return { ok: false, error: "관리자 권한이 필요합니다" };
  }
  return { ok: true, userId: user.id };
}

export type AdminPlanInput = {
  slug: "light" | "pro" | "premium";
  name: string;
  amount: number;
  durationDays: number;
  recommended: boolean;
  features: string[];
  guaranteeHtml?: string | null;
  sortOrder: number;
  isActive: boolean;
};

/**
 * F88 — plans 테이블 upsert. 마이그 미적용 시 명시적 안내.
 * recommended 단일 보장은 클라이언트 측 가드만 (DB 제약은 없음).
 */
export async function adminUpdatePlan(input: AdminPlanInput) {
  const g = await ensureAdmin();
  if (!g.ok) return g;

  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "플랜명을 입력해주세요" };
  if (input.amount < 0) return { ok: false as const, error: "금액이 음수일 수 없어요" };
  if (input.durationDays < 1 || input.durationDays > 3650) {
    return { ok: false as const, error: "기간은 1~3650일 사이여야 해요" };
  }
  if (input.features.length > 20) {
    return { ok: false as const, error: "feature는 최대 20개까지" };
  }

  const { error } = await supabaseAdmin.from("plans").upsert({
    slug: input.slug,
    name,
    amount: input.amount,
    duration_days: input.durationDays,
    recommended: input.recommended,
    features: input.features,
    guarantee_html: input.guaranteeHtml?.trim() || null,
    sort_order: input.sortOrder,
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
    updated_by: g.userId,
  });
  if (error) {
    if (
      (error as { code?: string }).code === "42P01" ||
      /relation .* plans .* does not exist/.test(error.message)
    ) {
      return { ok: false as const, error: "마이그레이션 적용 후 사용 가능해요" };
    }
    return { ok: false as const, error: error.message };
  }

  await writeAudit({
    adminUserId: g.userId,
    action: "plan.update",
    payload: { slug: input.slug, amount: input.amount, isActive: input.isActive },
  });

  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
  return { ok: true as const };
}
