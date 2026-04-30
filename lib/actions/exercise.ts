"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function logExercise({
  mode,
  title,
  note,
}: {
  mode: "courage" | "exposure";
  title: string;
  note?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const { error } = await supabase.from("exercise_logs").insert({
    user_id: user.id,
    exercise_id: null,
    exercise_key: mode,
    exercise_title: title,
    note: note ?? null,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
