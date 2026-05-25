"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type CoachNote = {
  id: string;
  coach_id: string;
  user_id: string;
  note: string;
  created_at: string;
  coach_nickname?: string | null;
};

async function requireCoachOrAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };
  const { data: u } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (u?.role !== "coach" && u?.role !== "admin") {
    return { ok: false as const, error: "상담사 또는 관리자 권한이 필요해요" };
  }
  return { ok: true as const, supabase, user, role: u.role as "coach" | "admin" };
}

export async function listCoachNotes(
  userId: string,
): Promise<
  | { ok: true; notes: CoachNote[]; viewerRole: "coach" | "admin"; viewerId: string }
  | { ok: false; error: string }
> {
  const c = await requireCoachOrAdmin();
  if (!c.ok) return { ok: false, error: c.error };

  const isAdmin = c.role === "admin";

  let query = c.supabase
    .from("coach_user_notes")
    .select("id, coach_id, user_id, note, created_at, coach:coach_id(nickname)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (!isAdmin) query = query.eq("coach_id", c.user.id);

  const { data, error } = await query;
  if (error) {
    // 테이블 부재 fallback (마이그 미적용)
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /coach_user_notes/.test(error.message)
    ) {
      return {
        ok: true,
        notes: [],
        viewerRole: isAdmin ? "admin" : "coach",
        viewerId: c.user.id,
      };
    }
    return { ok: false, error: error.message };
  }

  const notes: CoachNote[] = ((data ?? []) as Array<{
    id: string;
    coach_id: string;
    user_id: string;
    note: string;
    created_at: string;
    coach?: { nickname?: string | null } | null;
  }>).map((n) => ({
    id: n.id,
    coach_id: n.coach_id,
    user_id: n.user_id,
    note: n.note,
    created_at: n.created_at,
    coach_nickname: n.coach?.nickname ?? null,
  }));
  return {
    ok: true,
    notes,
    viewerRole: isAdmin ? "admin" : "coach",
    viewerId: c.user.id,
  };
}

export async function addCoachNote(userId: string, note: string) {
  const c = await requireCoachOrAdmin();
  if (!c.ok) return { ok: false as const, error: c.error };
  const trimmed = note.trim();
  if (!trimmed) return { ok: false as const, error: "메모를 입력해주세요" };
  if (trimmed.length > 2000)
    return { ok: false as const, error: "메모는 2000자 이내로 작성해주세요" };

  const { data, error } = await c.supabase
    .from("coach_user_notes")
    .insert({ coach_id: c.user.id, user_id: userId, note: trimmed })
    .select("id, coach_id, user_id, note, created_at")
    .single();
  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /coach_user_notes/.test(error.message)
    ) {
      return {
        ok: false as const,
        error: "메모 테이블이 아직 적용되지 않았어요",
      };
    }
    return { ok: false as const, error: error.message };
  }
  if (!data) return { ok: false as const, error: "메모를 저장하지 못했어요" };

  revalidatePath(`/admin/coach`);
  return { ok: true as const, note: data as CoachNote };
}

export async function deleteCoachNote(noteId: string) {
  const c = await requireCoachOrAdmin();
  if (!c.ok) return { ok: false as const, error: c.error };

  // RLS가 본인 코치만 DELETE 허용. 서버 추가 가드 불필요.
  const { error } = await c.supabase
    .from("coach_user_notes")
    .delete()
    .eq("id", noteId);
  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /coach_user_notes/.test(error.message)
    ) {
      return {
        ok: false as const,
        error: "메모 테이블이 아직 적용되지 않았어요",
      };
    }
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/admin/coach`);
  return { ok: true as const };
}
