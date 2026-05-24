import type { Plan } from "@/lib/auth/plan";

export type PaidPlan = Exclude<Plan, "free">;

export type PlanSpec = {
  slug: PaidPlan;
  name: string;
  amount: number;
  durationDays: number;
};

export const PLAN_SPECS: Record<PaidPlan, PlanSpec> = {
  light: { slug: "light", name: "라이트", amount: 254000, durationDays: 100 },
  pro: { slug: "pro", name: "프로", amount: 394000, durationDays: 100 },
  premium: { slug: "premium", name: "프리미엄", amount: 694000, durationDays: 100 },
};

export function getPlanSpec(slug: string | null | undefined): PlanSpec | null {
  if (slug === "light" || slug === "pro" || slug === "premium") {
    return PLAN_SPECS[slug];
  }
  return null;
}
