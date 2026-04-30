"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { autoCheckRoutine } from "./dashboard";

type ThoughtInput = {
  situation: string;
  thought?: string;
  emotion?: string;
  bodyReaction?: string;
  behavior?: string;
};

export async function addThoughtRecord(input: ThoughtInput) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("thought_records")
    .insert({
      user_id: user.id,
      situation: input.situation,
      thought: input.thought ?? "",
      emotion: input.emotion ?? "",
      body_reaction: input.bodyReaction ?? null,
      behavior: input.behavior ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };
  await autoCheckRoutine(supabase, user.id, "trash");
  return { ok: true as const, id: data.id };
}

export async function listThoughtRecords() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("thought_records")
    .select("id, situation, thought, emotion, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, records: data };
}
