import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminUser } from "@/lib/auth/plan";
import { PROGRAM_DAYS, computeRawDayNumber } from "@/lib/coach/day-number";
import { renewDueSubscriptions } from "@/lib/billing/subscription";

/**
 * 만료된 유료 플랜을 free로 강등 (만료일 경과 + 만료일 없는 계정의 100일 종료).
 * 강등 전에 월 구독 자동결제 갱신을 먼저 돌려, 갱신된 구독자가 강등되지 않게 함.
 * Vercel Cron이 매일 자정 KST(= UTC 15:00)에 호출.
 * 보안: CRON_SECRET 검증.
 */
export const dynamic = "force-dynamic";
// 자동결제 승인 1건당 최대 60초
export const maxDuration = 300;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const renewal = await renewDueSubscriptions().catch((e: unknown) => ({
    renewed: 0,
    failed: 0,
    ended: 0,
    errors: [e instanceof Error ? e.message : String(e)],
  }));

  const now = new Date().toISOString();
  const buildExpiryQuery = (withDeletedFilter: boolean) => {
    let qb = supabaseAdmin
      .from("users")
      .update({ plan: "free", updated_at: now })
      .lt("plan_expires_at", now)
      .neq("plan", "free");
    if (withDeletedFilter) qb = qb.is("deleted_at", null);
    return qb.select("id");
  };

  let { data, error } = await buildExpiryQuery(true);
  if (error && (error.code === "42703" || /deleted_at/.test(error.message))) {
    const r2 = await buildExpiryQuery(false);
    data = r2.data;
    error = r2.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const noExpiry = await downgradeFinishedWithoutExpiry(now);
  if (noExpiry.error) {
    return NextResponse.json({ error: noExpiry.error }, { status: 500 });
  }

  return NextResponse.json({
    downgraded: data?.length ?? 0,
    downgradedNoExpiry: noExpiry.count,
    subscriptions: renewal,
  });
}

/**
 * 만료일(plan_expires_at) 없이 부여된 유료 계정은 위 쿼리에 영원히 안 걸림.
 * 이 경우 100일 차수(결제일 → 알림 시작일 → 가입일 기준)가 끝나면 free로 강등
 * (2026-10-04 고객 요청: 100일 종료 후 재사용 시 결제 요청).
 * 운영자·코치 계정은 제외.
 */
async function downgradeFinishedWithoutExpiry(
  now: string,
): Promise<{ count: number; error?: string }> {
  type Row = {
    id: string;
    email: string | null;
    role: string | null;
    plan_started_at?: string | null;
    notifications_started_at: string | null;
    created_at: string | null;
  };
  const base = "id, email, role, notifications_started_at, created_at";
  const select = (cols: string) =>
    supabaseAdmin
      .from("users")
      .select(cols)
      .neq("plan", "free")
      .is("plan_expires_at", null)
      .is("deleted_at", null);

  let res = await select(`${base}, plan_started_at`);
  if (res.error && (res.error.code === "42703" || /plan_started_at/.test(res.error.message))) {
    res = await select(base);
  }
  if (res.error) return { count: 0, error: res.error.message };

  const finished = ((res.data ?? []) as unknown as Row[])
    .filter((u) => u.role !== "coach" && !isAdminUser(u.email, u.role))
    .filter((u) => {
      const day =
        computeRawDayNumber(u.plan_started_at) ??
        computeRawDayNumber(u.notifications_started_at) ??
        computeRawDayNumber(u.created_at);
      return day !== null && day > PROGRAM_DAYS;
    })
    .map((u) => u.id);
  if (finished.length === 0) return { count: 0 };

  const { error } = await supabaseAdmin
    .from("users")
    .update({ plan: "free", updated_at: now })
    .in("id", finished);
  if (error) return { count: 0, error: error.message };
  return { count: finished.length };
}
