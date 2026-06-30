"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensureAdmin } from "./admin-guard";
import { writeAudit } from "./_audit";

/**
 * 구독 관리 액션 — DB 상태만 변경. 외부 결제사(토스 빌링) 해지/재개 호출은 범위 밖.
 */

interface SubscriptionRow {
  id: string;
  user_id: string;
  status: string;
}

async function fetchSubscription(id: string) {
  return supabaseAdmin
    .from("subscriptions")
    .select("id, user_id, status")
    .eq("id", id)
    .maybeSingle();
}

/** 구독 해지 — status='cancelled', cancelled_at=now. */
export async function adminCancelSubscription(id: string) {
  const g = await ensureAdmin();
  if (!g.ok) return { ok: false as const, error: g.error };

  const { data, error } = await fetchSubscription(id);
  if (error || !data) {
    return { ok: false as const, error: "구독 정보를 찾을 수 없어요" };
  }
  const sub = data as unknown as SubscriptionRow;

  if (sub.status === "cancelled") {
    return { ok: false as const, error: "이미 해지된 구독이에요" };
  }

  const { error: ue } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);
  if (ue) return { ok: false as const, error: ue.message };

  await writeAudit({
    adminUserId: g.userId,
    action: "subscription.cancel",
    targetUserId: sub.user_id,
    payload: { subscriptionId: id, prevStatus: sub.status },
  });

  revalidatePath("/admin/subscriptions");
  revalidatePath(`/admin/subscriptions/${id}`);
  return { ok: true as const };
}

/** 구독 재개 — status='active', cancelled_at=null. */
export async function adminResumeSubscription(id: string) {
  const g = await ensureAdmin();
  if (!g.ok) return { ok: false as const, error: g.error };

  const { data, error } = await fetchSubscription(id);
  if (error || !data) {
    return { ok: false as const, error: "구독 정보를 찾을 수 없어요" };
  }
  const sub = data as unknown as SubscriptionRow;

  if (sub.status === "active") {
    return { ok: false as const, error: "이미 활성 상태인 구독이에요" };
  }

  const { error: ue } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "active", cancelled_at: null })
    .eq("id", id);
  if (ue) return { ok: false as const, error: ue.message };

  await writeAudit({
    adminUserId: g.userId,
    action: "subscription.resume",
    targetUserId: sub.user_id,
    payload: { subscriptionId: id, prevStatus: sub.status },
  });

  revalidatePath("/admin/subscriptions");
  revalidatePath(`/admin/subscriptions/${id}`);
  return { ok: true as const };
}
