import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "../../_ui/page-header";
import { MappedBadge } from "../../_ui/status-badge";
import { EmptyState } from "../../_ui/empty-state";
import { fmtDate, fmtDateTime, fmtMoney, fmtPhone } from "../../_ui/lib/fmt";
import {
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  planLabel,
} from "../../_ui/lib/labels";
import { SubscriptionActions } from "./subscription-actions";

interface SubscriptionRow {
  id: string;
  user_id: string;
  status: string;
  plan: string;
  billing_key: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
}

interface UserRow {
  id: string;
  email: string | null;
  nickname: string | null;
  plan: string | null;
  phone_number: string | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  plan: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gs-line-soft last:border-0">
      <span className="text-xs text-gs-muted font-bold shrink-0">{label}</span>
      <span className="text-sm text-gs-text-strong text-right break-all">
        {children}
      </span>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card p-5">
      <div className="text-sm font-[950] tracking-[-0.03em] text-gs-navy-900 mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

export default async function AdminSubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: subData, error: subErr } = await supabaseAdmin
    .from("subscriptions")
    .select(
      "id, user_id, status, plan, billing_key, current_period_start, current_period_end, cancelled_at, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if ((subErr as { code?: string } | null)?.code === "42P01") {
    return (
      <>
        <PageHeader title="구독 상세" backHref="/admin/subscriptions" />
        <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card p-8 text-center text-sm text-gs-muted">
          subscriptions 테이블이 아직 적용되지 않았어요.
        </div>
      </>
    );
  }
  if (!subData) notFound();
  const sub = subData as unknown as SubscriptionRow;

  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("id, email, nickname, plan, phone_number")
    .eq("id", sub.user_id)
    .maybeSingle();
  const user = (userData ?? null) as UserRow | null;

  const { data: paymentsData } = await supabaseAdmin
    .from("payments")
    .select("id, amount, plan, status, paid_at, created_at")
    .eq("user_id", sub.user_id)
    .order("created_at", { ascending: false })
    .limit(10);
  const payments = (paymentsData ?? []) as unknown as PaymentRow[];

  return (
    <>
      <PageHeader
        title="구독 상세"
        desc={user?.nickname ?? user?.email ?? sub.user_id}
        backHref="/admin/subscriptions"
        actions={<SubscriptionActions id={sub.id} status={sub.status} />}
      />

      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <Card title="구독 정보">
          <InfoRow label="상태">
            <MappedBadge value={sub.status} map={SUBSCRIPTION_STATUS} />
          </InfoRow>
          <InfoRow label="플랜">{planLabel(sub.plan)}</InfoRow>
          <InfoRow label="현재 기간 시작">{fmtDate(sub.current_period_start)}</InfoRow>
          <InfoRow label="현재 기간 종료">{fmtDate(sub.current_period_end)}</InfoRow>
          <InfoRow label="해지일">{fmtDateTime(sub.cancelled_at)}</InfoRow>
          <InfoRow label="빌링키">{sub.billing_key ?? "-"}</InfoRow>
          <InfoRow label="생성일">{fmtDateTime(sub.created_at)}</InfoRow>
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="가입자">
            <InfoRow label="닉네임">
              {user ? (
                <Link
                  href={`/admin/users/${user.id}`}
                  className="text-gs-blue font-bold hover:underline"
                >
                  {user.nickname ?? "사용자"}
                </Link>
              ) : (
                "-"
              )}
            </InfoRow>
            <InfoRow label="이메일">{user?.email ?? "-"}</InfoRow>
            <InfoRow label="현재 플랜">{planLabel(user?.plan)}</InfoRow>
            <InfoRow label="전화번호">{fmtPhone(user?.phone_number)}</InfoRow>
          </Card>

          <Card title="최근 결제">
            {payments.length === 0 ? (
              <EmptyState title="결제 내역이 없습니다" />
            ) : (
              <div className="flex flex-col">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-2.5 border-b border-gs-line-soft last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gs-text-strong">
                        {fmtMoney(p.amount)}
                        <span className="ml-1.5 text-xs text-gs-muted font-normal">
                          {planLabel(p.plan)}
                        </span>
                      </div>
                      <div className="text-[11px] text-gs-muted">
                        {fmtDateTime(p.paid_at ?? p.created_at)}
                      </div>
                    </div>
                    <MappedBadge value={p.status} map={PAYMENT_STATUS} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
