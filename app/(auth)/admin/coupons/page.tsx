import Link from "next/link";
import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { Card } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import { DeactivateCouponButton } from "./deactivate-button";

interface CouponRow {
  code: string;
  description: string | null;
  plan: string;
  duration_days: number;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("coupons")
    .select(
      "code, description, plan, duration_days, valid_from, valid_until, max_uses, used_count, is_active, created_at",
    )
    .order("created_at", { ascending: false });

  const migMissing =
    error &&
    ((error as { code?: string }).code === "42P01" ||
      /relation .* coupons .* does not exist/.test(error.message));

  const coupons: CouponRow[] = migMissing ? [] : ((data as CouponRow[]) ?? []);

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-2">
        <Link href="/admin" className="text-sm text-gs-blue">
          ← 대시보드
        </Link>
        <Link
          href="/admin/coupons/new"
          className="px-3 py-1.5 rounded-[10px] bg-gs-blue text-white text-sm font-bold"
        >
          + 새 쿠폰
        </Link>
      </div>
      <PageTitle>쿠폰 관리</PageTitle>
      <PageLead>토스 PG 통과 전에도 쿠폰으로 무료 체험 사용자 운영 가능.</PageLead>

      {migMissing && (
        <div className="mt-4 p-3 rounded-[12px] bg-gs-warning-bg border border-gs-warning-border text-xs text-gs-warning">
          <code>20260529_plans_coupons.sql</code> 마이그레이션을 먼저 적용해주세요.
        </div>
      )}

      <Card className="mt-6 p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gs-surface-muted border-b border-gs-line-soft">
            <tr className="text-left text-xs text-gs-muted">
              <th className="px-3 py-2">코드</th>
              <th className="px-3 py-2">플랜</th>
              <th className="px-3 py-2">기간(일)</th>
              <th className="px-3 py-2">사용/한도</th>
              <th className="px-3 py-2">만료</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gs-muted">
                  쿠폰이 없어요
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr
                  key={c.code}
                  className="border-b border-gs-line-soft hover:bg-gs-surface-muted/50"
                >
                  <td className="px-3 py-2 font-mono font-bold">
                    {c.code}
                    {c.description && (
                      <div className="text-[11px] text-gs-muted font-sans font-normal">
                        {c.description}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs uppercase font-bold">{c.plan}</td>
                  <td className="px-3 py-2">{c.duration_days}</td>
                  <td className="px-3 py-2">
                    {c.used_count}
                    {c.max_uses !== null ? `/${c.max_uses}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs text-gs-muted">
                    {c.valid_until
                      ? new Date(c.valid_until).toLocaleDateString("ko-KR")
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {c.is_active ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gs-success-bg text-gs-success font-bold">
                        활성
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gs-line-soft text-gs-muted font-bold">
                        비활성
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {c.is_active && <DeactivateCouponButton code={c.code} />}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </PageLayout>
  );
}
