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

const CODE_RX = /^[A-Z0-9_-]{4,40}$/;

export type AdminCreateCouponInput = {
  code: string;
  description?: string | null;
  plan: "light" | "pro" | "premium";
  durationDays: number;
  validFrom?: string | null;
  validUntil?: string | null;
  maxUses?: number | null;
};

export async function adminCreateCoupon(input: AdminCreateCouponInput) {
  const g = await ensureAdmin();
  if (!g.ok) return g;

  const code = input.code.trim().toUpperCase();
  if (!CODE_RX.test(code)) {
    return {
      ok: false as const,
      error: "코드는 영문 대문자/숫자/-_ 4~40자",
    };
  }
  if (input.durationDays < 1 || input.durationDays > 365) {
    return { ok: false as const, error: "기간은 1~365일" };
  }
  if (input.maxUses !== null && input.maxUses !== undefined && input.maxUses < 1) {
    return { ok: false as const, error: "최대 사용 횟수는 1 이상" };
  }

  const { error } = await supabaseAdmin.from("coupons").insert({
    code,
    description: input.description?.trim() || null,
    plan: input.plan,
    duration_days: input.durationDays,
    valid_from: input.validFrom || null,
    valid_until: input.validUntil || null,
    max_uses: input.maxUses ?? null,
    issued_by: g.userId,
  });
  if (error) {
    if (/duplicate key/i.test(error.message)) {
      return { ok: false as const, error: "이미 존재하는 코드예요" };
    }
    if ((error as { code?: string }).code === "42P01") {
      return { ok: false as const, error: "마이그레이션 적용 후 사용 가능해요" };
    }
    return { ok: false as const, error: error.message };
  }

  await writeAudit({
    adminUserId: g.userId,
    action: "coupon.create",
    payload: { code, plan: input.plan, durationDays: input.durationDays },
  });

  revalidatePath("/admin/coupons");
  return { ok: true as const };
}

export async function adminDeactivateCoupon(code: string) {
  const g = await ensureAdmin();
  if (!g.ok) return g;

  const { error } = await supabaseAdmin
    .from("coupons")
    .update({ is_active: false })
    .eq("code", code);
  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      return { ok: false as const, error: "마이그레이션 적용 후 사용 가능해요" };
    }
    return { ok: false as const, error: error.message };
  }

  await writeAudit({
    adminUserId: g.userId,
    action: "coupon.deactivate",
    payload: { code },
  });

  revalidatePath("/admin/coupons");
  return { ok: true as const };
}
