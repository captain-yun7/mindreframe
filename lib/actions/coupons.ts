"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const CODE_RX = /^[A-Z0-9_-]{4,40}$/;

/**
 * F88 — 사용자가 쿠폰 코드로 plan 활성화.
 *
 * 정책 (메인 default 결정):
 *   - 동일 사용자가 동일 쿠폰 1회만 사용 가능 (coupon_redemptions UNIQUE 제약)
 *   - 만료/비활성/소진된 쿠폰 거부
 *   - 적용 결과: users.plan + users.plan_expires_at 업데이트
 *
 * race condition: used_count는 단순 read-then-write. 1~2 오차 허용.
 */
export async function redeemCoupon(code: string) {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const normalized = code.trim().toUpperCase();
  if (!CODE_RX.test(normalized)) {
    return { ok: false as const, error: "쿠폰 코드 형식이 올바르지 않아요" };
  }

  // 1) 쿠폰 fetch + 유효성
  const { data: coupon, error: ce } = await supabaseAdmin
    .from("coupons")
    .select(
      "code, plan, duration_days, valid_from, valid_until, max_uses, used_count, is_active",
    )
    .eq("code", normalized)
    .maybeSingle();

  if (ce) {
    if ((ce as { code?: string }).code === "42P01") {
      return { ok: false as const, error: "쿠폰 시스템 준비 중입니다" };
    }
    return { ok: false as const, error: ce.message };
  }
  if (!coupon) {
    return { ok: false as const, error: "유효하지 않은 쿠폰이에요" };
  }

  const row = coupon as {
    code: string;
    plan: "light" | "pro" | "premium";
    duration_days: number;
    valid_from: string | null;
    valid_until: string | null;
    max_uses: number | null;
    used_count: number;
    is_active: boolean;
  };
  if (!row.is_active) {
    return { ok: false as const, error: "비활성화된 쿠폰이에요" };
  }
  const now = new Date();
  if (row.valid_from && new Date(row.valid_from) > now) {
    return { ok: false as const, error: "아직 사용 가능 기간이 아니에요" };
  }
  if (row.valid_until && new Date(row.valid_until) < now) {
    return { ok: false as const, error: "사용 기간이 지난 쿠폰이에요" };
  }
  if (row.max_uses !== null && row.used_count >= row.max_uses) {
    return { ok: false as const, error: "쿠폰 사용 횟수가 모두 소진됐어요" };
  }

  // 2) 중복 redemption 사전 차단 (UNIQUE index가 한 번 더 잡지만 사용자 메시지 명확화)
  const { data: existing } = await supabaseAdmin
    .from("coupon_redemptions")
    .select("id")
    .eq("coupon_code", normalized)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return { ok: false as const, error: "이미 사용한 쿠폰이에요" };
  }

  // 3) plan + 만료일 적용
  const expires = new Date();
  expires.setDate(expires.getDate() + row.duration_days);

  const { error: ue } = await supabaseAdmin
    .from("users")
    .update({
      plan: row.plan,
      plan_expires_at: expires.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (ue) return { ok: false as const, error: ue.message };

  // 4) redemption 기록 — UNIQUE 위반은 race condition 마지막 보호망
  const { error: re } = await supabaseAdmin.from("coupon_redemptions").insert({
    coupon_code: normalized,
    user_id: user.id,
    applied_plan: row.plan,
    applied_until: expires.toISOString(),
  });
  if (re) {
    if (/duplicate key/i.test(re.message)) {
      return { ok: false as const, error: "이미 사용한 쿠폰이에요" };
    }
    // 기록 실패해도 user plan은 이미 업데이트됨 — 운영자가 audit으로 추적
    console.error("[redeemCoupon] redemption insert failed:", re.message);
  }

  // 5) used_count 증가 (best-effort)
  await supabaseAdmin
    .from("coupons")
    .update({ used_count: row.used_count + 1 })
    .eq("code", normalized);

  revalidatePath("/pricing");
  revalidatePath("/mypage");
  return {
    ok: true as const,
    plan: row.plan,
    expiresAt: expires.toISOString(),
  };
}
