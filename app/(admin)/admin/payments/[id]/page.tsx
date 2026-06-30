import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "../../_ui/page-header";
import { MappedBadge } from "../../_ui/status-badge";
import { PAYMENT_STATUS, planLabel } from "../../_ui/lib/labels";
import { fmtDateTime, fmtMoney } from "../../_ui/lib/fmt";
import { RefundActionButton } from "../refund-action-button";

interface PaymentDetail {
  id: string;
  user_id: string;
  order_id: string;
  payment_key: string | null;
  amount: number;
  plan: string;
  payment_type: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  refunded_at: string | null;
  refund_reason: string | null;
  refund_amount: number | null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gs-line-soft last:border-0">
      <span className="text-xs text-gs-muted font-bold shrink-0">{label}</span>
      <span className="text-sm text-gs-text-strong text-right break-all">{children}</span>
    </div>
  );
}

function within7Days(date: string): boolean {
  return (Date.now() - new Date(date).getTime()) / 86_400_000 <= 7;
}

export const dynamic = "force-dynamic";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const baseCols =
    "id, user_id, order_id, payment_key, amount, plan, payment_type, status, paid_at, created_at";

  let { data, error } = await supabaseAdmin
    .from("payments")
    .select(`${baseCols}, refunded_at, refund_reason, refund_amount`)
    .eq("id", id)
    .single();
  if (error && ((error as { code?: string }).code === "42703" || /refund/.test(error.message))) {
    ({ data, error } = await supabaseAdmin.from("payments").select(baseCols).eq("id", id).single());
  }
  if (error || !data) notFound();
  const p = data as PaymentDetail;

  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("id, nickname, email, plan, plan_expires_at, phone_number")
    .eq("id", p.user_id)
    .single();
  const u = userData as
    | { id: string; nickname: string; email: string; plan: string | null; plan_expires_at: string | null; phone_number: string | null }
    | null;

  const refundable = p.status === "paid" && !p.refunded_at;

  return (
    <>
      <PageHeader
        title="결제 상세"
        desc={<span className="font-mono text-xs">{p.order_id}</span>}
        backHref="/admin/payments"
        backLabel="← 결제 목록"
        actions={
          <div className="flex items-center gap-2">
            <MappedBadge value={p.status} map={PAYMENT_STATUS} />
            {refundable && (
              <RefundActionButton
                paymentId={p.id}
                amount={p.amount}
                within7Days={within7Days(p.paid_at ?? p.created_at)}
              />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card p-5">
          <div className="text-sm font-[950] tracking-[-0.03em] text-gs-navy-900 mb-2">결제 정보</div>
          <Row label="주문번호">{p.order_id}</Row>
          <Row label="결제키">{p.payment_key ?? "-"}</Row>
          <Row label="플랜">{planLabel(p.plan)}</Row>
          <Row label="금액">{fmtMoney(p.amount)}</Row>
          <Row label="결제수단">{p.payment_type}</Row>
          <Row label="상태"><MappedBadge value={p.status} map={PAYMENT_STATUS} /></Row>
          <Row label="결제일">{fmtDateTime(p.paid_at)}</Row>
          <Row label="생성일">{fmtDateTime(p.created_at)}</Row>
          {p.refunded_at && (
            <>
              <Row label="환불일">{fmtDateTime(p.refunded_at)}</Row>
              <Row label="환불금액">{fmtMoney(p.refund_amount ?? p.amount)}</Row>
              <Row label="환불사유">{p.refund_reason ?? "-"}</Row>
            </>
          )}
        </div>

        <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card p-5">
          <div className="text-sm font-[950] tracking-[-0.03em] text-gs-navy-900 mb-2">가입자</div>
          {u ? (
            <>
              <Row label="닉네임">
                <Link href={`/admin/users/${u.id}`} className="text-gs-blue font-bold hover:underline">
                  {u.nickname}
                </Link>
              </Row>
              <Row label="이메일">{u.email}</Row>
              <Row label="현재 플랜">{planLabel(u.plan)}</Row>
              <Row label="플랜 종료">{fmtDateTime(u.plan_expires_at)}</Row>
              <Row label="휴대폰">{u.phone_number ?? "-"}</Row>
            </>
          ) : (
            <p className="text-sm text-gs-muted">가입자 정보를 찾을 수 없습니다.</p>
          )}
        </div>
      </div>
    </>
  );
}
