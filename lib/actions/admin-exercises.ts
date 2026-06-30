"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensureAdmin } from "./admin-guard";
import { writeAudit } from "./_audit";

export interface ExerciseInput {
  title: string;
  description: string;
  category: string;
  difficulty: number;
  sortOrder: number;
}

function validate(input: ExerciseInput): string | null {
  if (!input.title.trim()) return "제목은 필수입니다";
  if (input.title.length > 200) return "제목은 200자 이내";
  if (!input.description.trim()) return "설명은 필수입니다";
  if (input.description.length > 5000) return "설명은 5,000자 이내";
  if (!input.category.trim()) return "카테고리는 필수입니다";
  if (input.category.length > 80) return "카테고리는 80자 이내";
  if (
    !Number.isInteger(input.difficulty) ||
    input.difficulty < 1 ||
    input.difficulty > 5
  ) {
    return "난이도는 1~5";
  }
  if (!Number.isInteger(input.sortOrder)) return "정렬순서는 정수";
  return null;
}

export async function adminCreateExercise(input: ExerciseInput) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;
  const v = validate(input);
  if (v) return { ok: false as const, error: v };

  const { data, error } = await supabaseAdmin
    .from("exercises")
    .insert({
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      difficulty: input.difficulty,
      sort_order: input.sortOrder,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };

  await writeAudit({
    adminUserId: guard.userId,
    action: "exercise.create",
    payload: { id: data.id, title: input.title.trim() },
  });

  revalidatePath("/admin/exercises");
  return { ok: true as const, id: data.id };
}

export async function adminUpdateExercise(id: string, input: ExerciseInput) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;
  const v = validate(input);
  if (v) return { ok: false as const, error: v };

  const { error } = await supabaseAdmin
    .from("exercises")
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      difficulty: input.difficulty,
      sort_order: input.sortOrder,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  await writeAudit({
    adminUserId: guard.userId,
    action: "exercise.update",
    payload: { id, title: input.title.trim() },
  });

  revalidatePath("/admin/exercises");
  return { ok: true as const };
}

export async function adminDeleteExercise(id: string) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const { error } = await supabaseAdmin.from("exercises").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return { ok: false as const, error: "사용 이력이 있어 삭제할 수 없습니다" };
    }
    return { ok: false as const, error: error.message };
  }

  await writeAudit({
    adminUserId: guard.userId,
    action: "exercise.delete",
    payload: { id },
  });

  revalidatePath("/admin/exercises");
  return { ok: true as const };
}
