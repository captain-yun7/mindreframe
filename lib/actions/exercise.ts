"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkUsageOnly, incrementUsage } from "@/lib/ai/usage";
import { autoCheckRoutine } from "./dashboard";
import type {
  ExerciseLogPayload,
  LegacyExercisePayload,
} from "@/lib/exercise-payload";

/**
 * 행동연습장 4단계 도전 기록 — exercise_logs row 1건 저장.
 * note(text)에 JSON 직렬화. 라우틴 자동체크는 "courage" 키 유지(기존 호환).
 *
 * mode:
 *   - "anxiety" → exercise_key="anxiety" (원본 ws_logs의 anxiety_exposure)
 *   - "depress" → exercise_key="depress"
 *   - "courage" / "exposure" → 레거시(2026-05 sprint F6) 호환
 */
export async function logExercise({
  mode,
  title,
  payload,
}: {
  mode: "anxiety" | "depress" | "courage" | "exposure";
  title: string;
  payload: ExerciseLogPayload | LegacyExercisePayload;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  // 플랜 한도 사전 검사 — light 5회/일, pro 명시 차단(0), premium 무제한.
  const usage = await checkUsageOnly(supabase, user.id, "exercise");
  if (!usage.ok) {
    return { ok: false as const, error: usage.reason ?? "한도를 초과했어요" };
  }

  const noteJson = JSON.stringify(payload);

  const { error } = await supabase.from("exercise_logs").insert({
    user_id: user.id,
    exercise_id: null,
    exercise_key: mode,
    exercise_title: title,
    note: noteJson,
  });
  if (error) return { ok: false as const, error: error.message };

  // 한도 카운트 (insert 성공 시점)
  await incrementUsage(supabase, user.id, "exercise");

  // 라우틴 자동 체크는 항상 "courage" 키로 — 어떤 모드든 1점 인정.
  await autoCheckRoutine(supabase, user.id, "courage");
  revalidatePath("/progress");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
