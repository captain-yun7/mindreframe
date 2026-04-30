"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

const todayDate = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

export async function saveEmotionScore(score: number, source: "routine" | "trash" | "chat" = "routine") {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("emotion_scores")
    .upsert(
      {
        user_id: user.id,
        score,
        source,
        recorded_at: todayDate(),
      },
      { onConflict: "user_id,recorded_at,source" },
    );

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function saveGratitudeEntry(content: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("gratitude_entries")
    .insert({
      user_id: user.id,
      content,
      recorded_at: todayDate(),
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: data.id };
}

export async function toggleRoutineCheck(itemKey: string, checked: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  // 주차 계산: 가입 시점 기준이 아닌 단순 ISO week
  const now = new Date();
  const week = Math.ceil(
    ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86_400_000 +
      new Date(now.getFullYear(), 0, 1).getDay() +
      1) /
      7,
  );

  if (checked) {
    const { error } = await supabase
      .from("routine_checks")
      .upsert(
        {
          user_id: user.id,
          item_key: itemKey,
          week,
          checked_at: todayDate(),
        },
        { onConflict: "user_id,item_key,checked_at" },
      );
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase
      .from("routine_checks")
      .delete()
      .eq("user_id", user.id)
      .eq("item_key", itemKey)
      .eq("checked_at", todayDate());
    if (error) return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
