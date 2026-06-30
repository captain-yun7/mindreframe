import { PageHeader } from "../_ui/page-header";
import { Card } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import { PLAN_SPECS } from "@/lib/payments/plans";
import { PlanEditor } from "./plan-editor";

interface PlanRow {
  slug: "light" | "pro" | "premium";
  name: string;
  amount: number;
  duration_days: number;
  recommended: boolean;
  features: string[];
  guarantee_html: string | null;
  sort_order: number;
  is_active: boolean;
}

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("plans")
    .select(
      "slug, name, amount, duration_days, recommended, features, guarantee_html, sort_order, is_active",
    )
    .order("sort_order", { ascending: true });

  const migMissing =
    error &&
    ((error as { code?: string }).code === "42P01" ||
      /relation .* plans .* does not exist/.test(error.message));

  // 마이그 미적용 시 정적 fallback 시드 노출
  const plans: PlanRow[] = migMissing
    ? (["light", "pro", "premium"] as const).map((slug, i) => ({
        slug,
        name: PLAN_SPECS[slug].name,
        amount: PLAN_SPECS[slug].amount,
        duration_days: PLAN_SPECS[slug].durationDays,
        recommended: slug === "pro",
        features: [],
        guarantee_html: null,
        sort_order: i + 1,
        is_active: true,
      }))
    : ((data as PlanRow[]) ?? []);

  return (
    <>
      <PageHeader
        title="플랜·가격"
        desc="3개 플랜의 가격·기간·feature를 어드민에서 직접 편집."
      />

      {migMissing && (
        <div className="mt-4 p-3 rounded-[12px] bg-gs-warning-bg border border-gs-warning-border text-xs text-gs-warning">
          <code>20260529_plans_coupons.sql</code> 마이그레이션을 먼저 적용해주세요.
          저장 시 자동 INSERT됩니다.
        </div>
      )}

      <div className="mt-6 space-y-4">
        {plans.map((p) => (
          <Card key={p.slug} className="p-5">
            <PlanEditor initial={p} />
          </Card>
        ))}
      </div>
    </>
  );
}
