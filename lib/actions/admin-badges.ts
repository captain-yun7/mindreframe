"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensureAdmin } from "./admin-guard";
import { writeAudit } from "./_audit";

export interface BadgeInput {
  key: string;
  title: string;
  description: string;
  icon: string;
  /** JSON 문자열. 빈값이면 {} 로 저장. */
  condition: string;
}

// key: 영문 소문자/숫자/언더스코어/하이픈
const KEY_REGEX = /^[a-z0-9_-]+$/;

/**
 * condition 문자열을 jsonb 값으로 파싱(시스템 경계). 빈값이면 {}.
 * 성공 시 { value }, 실패 시 { error }.
 */
function parseCondition(
  raw: string,
): { value: unknown; error?: undefined } | { value?: undefined; error: string } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { value: {} };
  try {
    return { value: JSON.parse(trimmed) };
  } catch {
    return { error: "condition은 유효한 JSON이어야 합니다" };
  }
}

function validate(input: BadgeInput): string | null {
  if (!input.key || !KEY_REGEX.test(input.key)) {
    return "key는 영문 소문자/숫자/언더스코어/하이픈만 사용하세요";
  }
  if (input.key.length > 80) return "key는 80자 이내";
  if (!input.title || input.title.length > 120) return "제목은 1~120자";
  if (!input.description || input.description.length > 500) return "설명은 1~500자";
  if (!input.icon || input.icon.length > 40) return "아이콘은 1~40자";
  return null;
}

function mapDbError(error: { code?: string; message: string }): string {
  if (error.code === "42P01") {
    return "badges 테이블이 아직 생성되지 않았습니다 (마이그레이션 필요)";
  }
  if (error.code === "23505") return "이미 사용 중인 key입니다";
  if (error.code === "23503") {
    return "다른 데이터가 참조 중이라 처리할 수 없습니다";
  }
  return error.message;
}

export async function adminCreateBadge(input: BadgeInput) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const v = validate(input);
  if (v) return { ok: false as const, error: v };

  const parsed = parseCondition(input.condition);
  if (parsed.error) return { ok: false as const, error: parsed.error };

  const { data, error } = await supabaseAdmin
    .from("badges")
    .insert({
      key: input.key,
      title: input.title,
      description: input.description,
      icon: input.icon,
      condition: parsed.value,
    })
    .select("id, key")
    .single();
  if (error) return { ok: false as const, error: mapDbError(error) };

  await writeAudit({
    adminUserId: guard.userId,
    action: "badge.create",
    payload: { badgeId: data.id, key: data.key },
  });

  revalidatePath("/admin/badges");
  return { ok: true as const, id: data.id };
}

export async function adminUpdateBadge(id: string, input: BadgeInput) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const v = validate(input);
  if (v) return { ok: false as const, error: v };

  const parsed = parseCondition(input.condition);
  if (parsed.error) return { ok: false as const, error: parsed.error };

  const { error } = await supabaseAdmin
    .from("badges")
    .update({
      key: input.key,
      title: input.title,
      description: input.description,
      icon: input.icon,
      condition: parsed.value,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: mapDbError(error) };

  await writeAudit({
    adminUserId: guard.userId,
    action: "badge.update",
    payload: { badgeId: id, key: input.key },
  });

  revalidatePath("/admin/badges");
  revalidatePath(`/admin/badges/${id}/edit`);
  return { ok: true as const };
}

export async function adminDeleteBadge(id: string) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const { data: row } = await supabaseAdmin
    .from("badges")
    .select("key")
    .eq("id", id)
    .single();

  const { error } = await supabaseAdmin.from("badges").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return {
        ok: false as const,
        error: "보유자가 있어 삭제할 수 없습니다. 먼저 모든 보유자에게서 회수하세요",
      };
    }
    return { ok: false as const, error: mapDbError(error) };
  }

  await writeAudit({
    adminUserId: guard.userId,
    action: "badge.delete",
    payload: { badgeId: id, key: row?.key ?? null },
  });

  revalidatePath("/admin/badges");
  return { ok: true as const };
}

export async function adminGrantBadge(badgeId: string, email: string) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const cleanEmail = (email ?? "").trim().toLowerCase();
  if (!cleanEmail) return { ok: false as const, error: "이메일을 입력하세요" };

  const { data: user, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", cleanEmail)
    .maybeSingle();
  if (userErr) return { ok: false as const, error: mapDbError(userErr) };
  if (!user) return { ok: false as const, error: "해당 이메일의 유저가 없습니다" };

  const { error } = await supabaseAdmin
    .from("user_badges")
    .insert({ user_id: user.id, badge_id: badgeId });
  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "이미 보유한 뱃지입니다" };
    }
    return { ok: false as const, error: mapDbError(error) };
  }

  await writeAudit({
    adminUserId: guard.userId,
    action: "badge.grant",
    targetUserId: user.id,
    payload: { badgeId, email: cleanEmail },
  });

  revalidatePath(`/admin/badges/${badgeId}/edit`);
  revalidatePath("/admin/badges");
  return { ok: true as const };
}

export async function adminRevokeBadge(badgeId: string, userId: string) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const { error } = await supabaseAdmin
    .from("user_badges")
    .delete()
    .eq("badge_id", badgeId)
    .eq("user_id", userId);
  if (error) return { ok: false as const, error: mapDbError(error) };

  await writeAudit({
    adminUserId: guard.userId,
    action: "badge.revoke",
    targetUserId: userId,
    payload: { badgeId },
  });

  revalidatePath(`/admin/badges/${badgeId}/edit`);
  revalidatePath("/admin/badges");
  return { ok: true as const };
}
