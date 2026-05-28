"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkUsageOnly, incrementUsage } from "@/lib/ai/usage";
import { autoCheckRoutine } from "./dashboard";

export async function logMeditation({
  trackSlug,
  trackTitle,
  duration,
}: {
  trackSlug: string;
  trackTitle: string;
  duration: number;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  // 플랜 한도 사전 검사 — light 5회/일, pro 명시 차단(0), premium 무제한.
  const usage = await checkUsageOnly(supabase, user.id, "meditation");
  if (!usage.ok) {
    return { ok: false as const, error: usage.reason ?? "한도를 초과했어요" };
  }

  const { error } = await supabase.from("meditation_logs").insert({
    user_id: user.id,
    track_id: null,
    track_slug: trackSlug,
    track_title: trackTitle,
    duration,
  });
  if (error) return { ok: false as const, error: error.message };

  // 한도 카운트 (insert 성공 시점)
  await incrementUsage(supabase, user.id, "meditation");

  await autoCheckRoutine(supabase, user.id, "focus3");
  revalidatePath("/progress");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
