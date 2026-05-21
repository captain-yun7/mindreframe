"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayKst, isoWeekKst, calcStreak } from "@/lib/dates";

const todayDate = todayKst;
const isoWeek = isoWeekKst;

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

interface TodayDashboardRpc {
  mood: number | null;
  gratitude: { id: string; content: string } | null;
  todayCheckedKeys: string[];
  allCheckedDates: string[];
}

export async function loadTodayDashboard() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const today = todayDate();
  const { data, error } = await supabase.rpc("get_today_dashboard", {
    p_user_id: user.id,
    p_today: today,
  });
  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "데이터 로드 실패" };
  }
  const rpc = data as TodayDashboardRpc;

  const dateSet = new Set(rpc.allCheckedDates);
  const streak = calcStreak(dateSet);
  const totalDays = dateSet.size;

  return {
    ok: true as const,
    moodScore: rpc.mood ?? null,
    gratitudeDone: !!rpc.gratitude,
    gratitudeContent: rpc.gratitude?.content ?? "",
    checkedKeys: rpc.todayCheckedKeys,
    today,
    streak,
    totalDays,
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
