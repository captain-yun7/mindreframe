import type { Plan } from "@/lib/auth/plan";

export type PaidPlan = Exclude<Plan, "free">;

export type PlanSpec = {
  slug: PaidPlan;
  name: string;
  amount: number;
  durationDays: number;
};

/** F88 — DB 미적용 환경 fallback. plans 테이블 시드와 동일 값. */
export const PLAN_SPECS: Record<PaidPlan, PlanSpec> = {
  light: { slug: "light", name: "라이트", amount: 254000, durationDays: 100 },
  pro: { slug: "pro", name: "프로", amount: 394000, durationDays: 100 },
  premium: { slug: "premium", name: "프리미엄", amount: 694000, durationDays: 100 },
};

function isPaidPlan(slug: string | null | undefined): slug is PaidPlan {
  return slug === "light" || slug === "pro" || slug === "premium";
}

/**
 * F88 — DB의 plans 테이블에서 가격/기간을 조회. 실패 시 정적 fallback.
 *
 * - server-only (supabaseAdmin 사용)
 * - 모든 호출처(server action / server component)는 await 필요
 * - 미적용 환경에선 PLAN_SPECS와 동일
 */
export async function getPlanSpec(
  slug: string | null | undefined,
): Promise<PlanSpec | null> {
  if (!isPaidPlan(slug)) return null;
  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin");
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("slug, name, amount, duration_days, is_active")
      .eq("slug", slug)
      .maybeSingle();
    if (!error && data) {
      const row = data as {
        slug: PaidPlan;
        name: string;
        amount: number;
        duration_days: number;
        is_active: boolean;
      };
      if (row.is_active) {
        return {
          slug: row.slug,
          name: row.name,
          amount: row.amount,
          durationDays: row.duration_days,
        };
      }
    }
  } catch {
    // 테이블 부재 / RLS / 기타 → fallback
  }
  return PLAN_SPECS[slug];
}
