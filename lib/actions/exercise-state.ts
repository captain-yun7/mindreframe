"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type {
  AnxietyPlanItem,
  DepressPlanItem,
  ExerciseMode,
} from "@/lib/exercise-payload";

/**
 * H5/F114 — 행동연습장 진행 상태 DB 영속화.
 *
 * 단일 row(`exercise_state`)에 모든 단계 입력 상태를 jsonb로 저장.
 * 페이지 진입 시 server에서 1회 fetch → client에 props로 전달.
 * 클라이언트는 변경 시 debounce로 saveExerciseState 호출.
 */

export interface ExerciseStateRow {
  mode: ExerciseMode | null;
  anxPlan: AnxietyPlanItem[] | null;
  depPlan: DepressPlanItem[] | null;
  anxSaved: boolean;
  depSaved: boolean;
  anxSelectedIdx: number | null;
  depSelectedIdx: number | null;
  anxStep4: AnxStep4 | null;
  depStep4: DepStep4 | null;
  step4Open: boolean;
}

export interface AnxStep4 {
  did: "did" | "no";
  before: string;
  after: string;
  learned: string;
  unexpected: string;
}

export interface DepStep4 {
  did: "did" | "no";
  afterMood: string;
  learned: string;
  unexpected: string;
}

export interface ExerciseStatePartial {
  mode?: ExerciseMode | null;
  anxPlan?: AnxietyPlanItem[] | null;
  depPlan?: DepressPlanItem[] | null;
  anxSaved?: boolean;
  depSaved?: boolean;
  anxSelectedIdx?: number | null;
  depSelectedIdx?: number | null;
  anxStep4?: AnxStep4 | null;
  depStep4?: DepStep4 | null;
  step4Open?: boolean;
}

export async function loadExerciseState(): Promise<ExerciseStateRow | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("exercise_state")
    .select(
      "mode, anx_plan, dep_plan, anx_saved, dep_saved, anx_selected_idx, dep_selected_idx, anx_step4, dep_step4, step4_open",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    mode: (data.mode as ExerciseMode | null) ?? null,
    anxPlan: (data.anx_plan as AnxietyPlanItem[] | null) ?? null,
    depPlan: (data.dep_plan as DepressPlanItem[] | null) ?? null,
    anxSaved: Boolean(data.anx_saved),
    depSaved: Boolean(data.dep_saved),
    anxSelectedIdx: (data.anx_selected_idx as number | null) ?? null,
    depSelectedIdx: (data.dep_selected_idx as number | null) ?? null,
    anxStep4: (data.anx_step4 as AnxStep4 | null) ?? null,
    depStep4: (data.dep_step4 as DepStep4 | null) ?? null,
    step4Open: Boolean(data.step4_open),
  };
}

export async function saveExerciseState(partial: ExerciseStatePartial) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const row: Record<string, unknown> = { user_id: user.id };
  if ("mode" in partial) row.mode = partial.mode;
  if ("anxPlan" in partial) row.anx_plan = partial.anxPlan;
  if ("depPlan" in partial) row.dep_plan = partial.depPlan;
  if ("anxSaved" in partial) row.anx_saved = partial.anxSaved;
  if ("depSaved" in partial) row.dep_saved = partial.depSaved;
  if ("anxSelectedIdx" in partial) row.anx_selected_idx = partial.anxSelectedIdx;
  if ("depSelectedIdx" in partial) row.dep_selected_idx = partial.depSelectedIdx;
  if ("anxStep4" in partial) row.anx_step4 = partial.anxStep4;
  if ("depStep4" in partial) row.dep_step4 = partial.depStep4;
  if ("step4Open" in partial) row.step4_open = partial.step4Open;

  const { error } = await supabase
    .from("exercise_state")
    .upsert(row, { onConflict: "user_id" });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
