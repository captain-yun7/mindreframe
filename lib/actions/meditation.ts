"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
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

  const { error } = await supabase.from("meditation_logs").insert({
    user_id: user.id,
    track_id: null,
    track_slug: trackSlug,
    track_title: trackTitle,
    duration,
  });
  if (error) return { ok: false as const, error: error.message };
  await autoCheckRoutine(supabase, user.id, "focus3");
  return { ok: true as const };
}
