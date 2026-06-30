import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "../../_ui/page-header";
import { AdminTable, type Column } from "../../_ui/admin-table";
import { StatusBadge } from "../../_ui/status-badge";
import { fmtDateTime } from "../../_ui/lib/fmt";
import { planLabel } from "../../_ui/lib/labels";
import { CouponEditForm } from "./coupon-edit-form";

interface CouponData {
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

interface RedemptionRow {
  id: string;
  user_id: string;
  applied_plan: string;
  applied_until: string;
  redeemed_at: string;
  email: string | null;
  nickname: string | null;
}

export const dynamic = "force-dynamic";

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireAdmin();
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode);

  const { data: coupon, error } = await supabaseAdmin
    .from("coupons")
    .select(
      "code, description, plan, duration_days, valid_from, valid_until, max_uses, used_count, is_active, created_at",
    )
    .eq("code", code)
    .single();

  if (error || !coupon) notFound();
  const c = coupon as CouponData;

  // 사용 이력 + 유저 매핑
  const { data: redData } = await supabaseAdmin
    .from("coupon_redemptions")
    .select("id, user_id, applied_plan, applied_until, redeemed_at")
    .eq("coupon_code", code)
    .order("redeemed_at", { ascending: false })
    .limit(200);

  const reds = (redData as Omit<RedemptionRow, "email" | "nickname">[]) ?? [];
  const userIds = [...new Set(reds.map((r) => r.user_id))];
  const userMap = new Map<string, { email: string; nickname: string }>();
  if (userIds.length > 0) {
    const { data: us } = await supabaseAdmin
      .from("users")
      .select("id, email, nickname")
      .in("id", userIds);
    for (const u of (us as { id: string; email: string; nickname: string }[]) ?? []) {
      userMap.set(u.id, { email: u.email, nickname: u.nickname });
    }
  }
  const redemptions: RedemptionRow[] = reds.map((r) => ({
    ...r,
    email: userMap.get(r.user_id)?.email ?? null,
    nickname: userMap.get(r.user_id)?.nickname ?? null,
  }));

  const redColumns: Column<RedemptionRow>[] = [
    { key: "when", header: "사용 시각", cell: (r) => <span className="text-xs">{fmtDateTime(r.redeemed_at)}</span> },
    {
      key: "user",
      header: "사용자",
      cell: (r) => (
        <div>
          <div className="font-bold text-sm">{r.nickname ?? "(알 수 없음)"}</div>
          <div className="text-[11px] text-gs-muted">{r.email ?? r.user_id}</div>
        </div>
      ),
    },
    { key: "plan", header: "적용 플랜", cell: (r) => <span className="text-xs">{planLabel(r.applied_plan)}</span> },
    { key: "until", header: "적용 종료", cell: (r) => <span className="text-xs">{fmtDateTime(r.applied_until)}</span> },
  ];

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{c.code}</span>}
        desc={c.description ?? undefined}
        backHref="/admin/coupons"
        backLabel="← 쿠폰 목록"
        actions={
          c.is_active ? (
            <StatusBadge tone="success">활성</StatusBadge>
          ) : (
            <StatusBadge tone="neutral">비활성</StatusBadge>
          )
        }
      />

      <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card p-5">
          <div className="text-sm font-[950] tracking-[-0.03em] text-gs-navy-900 mb-4">
            쿠폰 편집
          </div>
          <CouponEditForm coupon={c} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card p-4">
              <div className="text-xs text-gs-muted font-bold">사용 횟수</div>
              <div className="text-2xl font-extrabold tracking-[-0.02em] mt-1 text-gs-navy-900 tabular-nums">
                {c.used_count}
                {c.max_uses !== null ? ` / ${c.max_uses}` : ""}
              </div>
            </div>
            <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card p-4">
              <div className="text-xs text-gs-muted font-bold">부여 플랜·기간</div>
              <div className="text-lg font-extrabold tracking-[-0.02em] mt-1 text-gs-navy-900">
                {planLabel(c.plan)} · {c.duration_days}일
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-[950] tracking-[-0.03em] text-gs-navy-900 mb-3">
              사용 이력 ({redemptions.length})
            </div>
            <AdminTable
              columns={redColumns}
              rows={redemptions}
              rowKey={(r) => r.id}
              empty={{ title: "아직 사용 이력이 없습니다" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
