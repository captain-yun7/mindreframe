"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { autoCheckRoutine } from "./dashboard";
import type { ExercisePayload } from "@/lib/exercise-payload";

export async function logExercise({
  mode,
  title,
  payload,
}: {
  mode: "courage" | "exposure";
  title: string;
  payload: ExercisePayload;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const noteJson = JSON.stringify(payload);

  const { error } = await supabase.from("exercise_logs").insert({
    user_id: user.id,
    exercise_id: null,
    exercise_key: mode,
    exercise_title: title,
    note: noteJson,
  });
  if (error) return { ok: false as const, error: error.message };
  await autoCheckRoutine(supabase, user.id, "courage");
  return { ok: true as const };
}
