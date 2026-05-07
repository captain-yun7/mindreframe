"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

const todayDate = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const isoWeek = () => {
  const now = new Date();
  return Math.ceil(
    ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86_400_000 +
      new Date(now.getFullYear(), 0, 1).getDay() +
      1) /
      7,
  );
};

/**
 * routine_checks 자동 등록 (다른 server action에서 호출).
 * 본인 데이터 보장을 위해 supabase 클라이언트를 인자로 받음.
 */
export async function autoCheckRoutine(
  supabase: SupabaseClient,
  userId: string,
  itemKey: string,
) {
  await supabase
    .from("routine_checks")
    .upsert(
      {
        user_id: userId,
        item_key: itemKey,
        week: isoWeek(),
        checked_at: todayDate(),
      },
      { onConflict: "user_id,item_key,checked_at" },
    );
}

export async function loadTodayDashboard() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const today = todayDate();
  const [mood, gratitude, checks] = await Promise.all([
    supabase
      .from("emotion_scores")
      .select("score")
      .eq("user_id", user.id)
      .eq("recorded_at", today)
      .eq("source", "routine")
      .maybeSingle(),
    supabase
      .from("gratitude_entries")
      .select("id, content")
      .eq("user_id", user.id)
      .eq("recorded_at", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("routine_checks")
      .select("item_key")
      .eq("user_id", user.id)
      .eq("checked_at", today),
  ]);

  return {
    ok: true as const,
    moodScore: mood.data?.score ?? null,
    gratitudeDone: !!gratitude.data,
    gratitudeContent: gratitude.data?.content ?? "",
    checkedKeys: (checks.data ?? []).map((r) => r.item_key),
    today,
  };
}

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
  if (source === "routine") await autoCheckRoutine(supabase, user.id, "mood");
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
  await autoCheckRoutine(supabase, user.id, "gratitude");
  return { ok: true as const, id: data.id };
}

export async function toggleRoutineCheck(itemKey: string, checked: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  if (checked) {
    await autoCheckRoutine(supabase, user.id, itemKey);
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
