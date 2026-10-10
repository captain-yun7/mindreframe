"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cancelSubscription, resumeSubscription } from "@/lib/billing/subscription";

async function currentUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function cancelMySubscription() {
  const userId = await currentUserId();
  if (!userId) return { ok: false as const, error: "로그인이 필요합니다" };
  const r = await cancelSubscription(userId);
  if (!r.ok) return { ok: false as const, error: r.message };
  revalidatePath("/mypage");
  return { ok: true as const, until: r.until };
}

export async function resumeMySubscription() {
  const userId = await currentUserId();
  if (!userId) return { ok: false as const, error: "로그인이 필요합니다" };
  const r = await resumeSubscription(userId);
  if (!r.ok) return { ok: false as const, error: r.message };
  revalidatePath("/mypage");
  return { ok: true as const };
}
