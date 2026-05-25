"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { writeAudit } from "./_audit";

async function requireCoachOrAdmin(): Promise<
  | { ok: true; viewerId: string }
  | { ok: false; error: string }
> {
  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };
  const { data: u } = await sb
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (u as { role?: string } | null)?.role;
  if (role !== "coach" && role !== "admin") {
    return { ok: false, error: "권한이 부족해요" };
  }
  return { ok: true, viewerId: user.id };
}

export type ExerciseLogPreview = {
  id: string;
  completed_at: string | null;
  exercise_key: string | null;
  exercise_title: string | null;
  note: string | null;
};

/**
 * F82 — 동의한 사용자의 행동연습장 기록을 코치/관리자가 열람.
 *
 * 흐름:
 *   1) viewer가 coach/admin인지 가드
 *   2) 대상 사용자의 allow_coach_view_exercise=true 확인
 *      - 컬럼 부재(마이그 미적용) → "마이그레이션 적용 후 사용 가능"
 *      - false → "사용자가 열람을 허용하지 않았어요"
 *   3) supabaseAdmin으로 exercise_logs select (RLS 우회 — 가드는 위에서 끝)
 *   4) 열람 사실은 audit log
 */
export async function listExerciseLogsForCoach(
  userId: string,
  limit = 30,
): Promise<
  | { ok: true; logs: ExerciseLogPreview[] }
  | { ok: false; error: string }
> {
  const g = await requireCoachOrAdmin();
  if (!g.ok) return g;

  const { data: target, error: targetErr } = await supabaseAdmin
    .from("users")
    .select("allow_coach_view_exercise")
    .eq("id", userId)
    .maybeSingle();
  if (targetErr) {
    if (
      (targetErr as { code?: string }).code === "42703" ||
      /allow_coach_view_exercise/.test(targetErr.message)
    ) {
      return { ok: false, error: "마이그레이션 적용 후 사용 가능해요" };
    }
    return { ok: false, error: targetErr.message };
  }
  if (!target) return { ok: false, error: "사용자를 찾을 수 없어요" };

  const allowed = (target as { allow_coach_view_exercise?: boolean | null })
    .allow_coach_view_exercise;
  if (!allowed) {
    return { ok: false, error: "사용자가 열람을 허용하지 않았어요" };
  }

  const { data, error } = await supabaseAdmin
    .from("exercise_logs")
    .select("id, completed_at, exercise_key, exercise_title, note")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      return { ok: false, error: "행동연습장 데이터가 없어요" };
    }
    // exercise_key/title이 없는 환경
    if (
      (error as { code?: string }).code === "42703" ||
      /exercise_key|exercise_title/.test(error.message)
    ) {
      const r2 = await supabaseAdmin
        .from("exercise_logs")
        .select("id, completed_at, note")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(limit);
      if (r2.error) return { ok: false, error: r2.error.message };
      const logs = (r2.data ?? []).map((row) => ({
        id: (row as { id: string }).id,
        completed_at: (row as { completed_at?: string | null }).completed_at ?? null,
        exercise_key: null,
        exercise_title: null,
        note: (row as { note?: string | null }).note ?? null,
      }));
      await writeAudit({
        adminUserId: g.viewerId,
        action: "exercise.view",
        targetUserId: userId,
        payload: { count: logs.length },
      });
      return { ok: true, logs };
    }
    return { ok: false, error: error.message };
  }

  const logs = (data ?? []) as ExerciseLogPreview[];
  await writeAudit({
    adminUserId: g.viewerId,
    action: "exercise.view",
    targetUserId: userId,
    payload: { count: logs.length },
  });
  return { ok: true, logs };
}
