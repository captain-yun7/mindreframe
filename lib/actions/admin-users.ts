"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Plan } from "@/lib/auth/plan";

async function ensureAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };
  const { data: u } = await sb.from("users").select("role").eq("id", user.id).single();
  if (u?.role !== "admin") return { ok: false, error: "관리자 권한이 필요합니다" };
  return { ok: true };
}

export async function adminUpdateUserPlan(
  userId: string,
  plan: Plan,
  expiresInDays: number | null,
) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const update: Record<string, unknown> = { plan, updated_at: new Date().toISOString() };
  if (expiresInDays !== null) {
    const d = new Date();
    d.setDate(d.getDate() + expiresInDays);
    update.plan_expires_at = d.toISOString();
  }

  const { error } = await supabaseAdmin.from("users").update(update).eq("id", userId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { ok: true as const };
}

export async function adminUpdateUserRole(userId: string, role: "user" | "coach" | "admin") {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const { error } = await supabaseAdmin
    .from("users")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/users/${userId}`);
  return { ok: true as const };
}

export async function adminUpdateUserNotification(
  userId: string,
  notificationHour: number | null,
  active: boolean,
) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (notificationHour !== null) {
    if (notificationHour < 8 || notificationHour > 20) {
      return { ok: false as const, error: "발송 시간은 8~20시 사이여야 해요" };
    }
    update.notification_hour = notificationHour;
  }
  // active=false면 notifications_started_at 비우기 → cron이 발송 안 함
  if (!active) {
    update.notifications_started_at = null;
  }

  const { error } = await supabaseAdmin.from("users").update(update).eq("id", userId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/users/${userId}`);
  return { ok: true as const };
}
