"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Plan } from "@/lib/auth/plan";
import { writeAudit } from "@/lib/actions/_audit";
import { todayKst } from "@/lib/dates";

async function ensureAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };
  if (user.email === "mindtheater00@gmail.com") return { ok: true, userId: user.id };
  const { data: u } = await sb.from("users").select("role").eq("id", user.id).single();
  if (u?.role !== "admin") return { ok: false, error: "관리자 권한이 필요합니다" };
  return { ok: true, userId: user.id };
}

export async function adminUpdateUserPlan(
  userId: string,
  plan: Plan,
  expiresInDays: number | null,
) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const update: Record<string, unknown> = { plan, updated_at: new Date().toISOString() };
  if (expiresInDays !== null) {
    const d = new Date();
    d.setDate(d.getDate() + expiresInDays);
    update.plan_expires_at = d.toISOString();
  }

  // 유료 플랜 수동 부여 시 결제 플로우와 동일하게 알림 시작.
  // 번호 있고 아직 미시작(started_at NULL)인 경우만 오늘로 세팅 (기존 시작일은 보존).
  if (plan !== "free") {
    const { data: cur } = await supabaseAdmin
      .from("users")
      .select("phone_number, notifications_started_at")
      .eq("id", userId)
      .single();
    const c = cur as { phone_number?: string | null; notifications_started_at?: string | null } | null;
    if (c?.phone_number && !c.notifications_started_at) {
      update.notifications_started_at = todayKst();
    }
  }

  const { error } = await supabaseAdmin.from("users").update(update).eq("id", userId);
  if (error) return { ok: false as const, error: error.message };

  await writeAudit({
    adminUserId: guard.userId,
    action: "user.update_plan",
    targetUserId: userId,
    payload: { plan, expiresInDays },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { ok: true as const };
}

export async function adminUpdateUserRole(userId: string, role: "user" | "coach" | "admin") {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  // 자가 권한 변경 차단 — admin이 본인을 강등하면 운영 잠금 발생 가능
  if (userId === guard.userId && role !== "admin") {
    return { ok: false as const, error: "본인 권한은 변경할 수 없어요" };
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { ok: false as const, error: error.message };

  await writeAudit({
    adminUserId: guard.userId,
    action: "user.update_role",
    targetUserId: userId,
    payload: { role },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { ok: true as const };
}

export async function adminUpdateUserNotification(
  userId: string,
  notificationHour: number | null,
  active: boolean,
) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (notificationHour !== null) {
    if (notificationHour < 8 || notificationHour > 20) {
      return { ok: false as const, error: "발송 시간은 8~20시 사이여야 해요" };
    }
    update.notification_hour = notificationHour;
  }
  // active 토글: 끄면 started_at 비우고, 켜는데 아직 미시작이면 오늘로 세팅
  // (이미 시작일 있으면 보존 — 일차 카운트 리셋 방지)
  if (!active) {
    update.notifications_started_at = null;
  } else {
    const { data: cur } = await supabaseAdmin
      .from("users")
      .select("notifications_started_at")
      .eq("id", userId)
      .single();
    const started = (cur as { notifications_started_at?: string | null } | null)
      ?.notifications_started_at;
    if (!started) {
      update.notifications_started_at = todayKst();
    }
  }

  const { error } = await supabaseAdmin.from("users").update(update).eq("id", userId);
  if (error) return { ok: false as const, error: error.message };

  await writeAudit({
    adminUserId: guard.userId,
    action: "user.update_notification",
    targetUserId: userId,
    payload: { notificationHour, active },
  });

  revalidatePath(`/admin/users/${userId}`);
  return { ok: true as const };
}

/**
 * E-2 — coach/admin의 텔레그램 chat_id 등록. 일반 사용자 대상에는 의미 없지만
 * 본인 발화 시 알림을 받기 위한 코치 식별자 등록 용도.
 *
 * chat_id 포맷: 양수(개인) 또는 음수(그룹). 가벼운 정규식 검증.
 */
export async function adminUpdateUserTelegramChatId(
  userId: string,
  chatId: string | null,
) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const trimmed = chatId?.trim() ?? "";
  if (trimmed && !/^-?\d+$/.test(trimmed)) {
    return {
      ok: false as const,
      error: "chat_id는 숫자 또는 -숫자 형식이에요",
    };
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      telegram_chat_id: trimmed || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) {
    if (
      (error as { code?: string }).code === "42703" ||
      /telegram_chat_id/.test(error.message)
    ) {
      return {
        ok: false as const,
        error: "마이그레이션 적용 후 사용 가능해요",
      };
    }
    return { ok: false as const, error: error.message };
  }

  await writeAudit({
    adminUserId: guard.userId,
    action: "user.update_telegram_chat_id",
    targetUserId: userId,
    payload: { hasChatId: !!trimmed },
  });

  revalidatePath(`/admin/users/${userId}`);
  return { ok: true as const };
}

export async function adminUpdateUserNickname(userId: string, nickname: string) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const trimmed = nickname.trim();
  if (!trimmed) return { ok: false as const, error: "닉네임을 입력해주세요" };
  if (trimmed.length > 30) {
    return { ok: false as const, error: "닉네임은 30자 이내로 입력해주세요" };
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ nickname: trimmed, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    // F255 — nickname unique 인덱스 위반 시 친절 안내
    const code = (error as { code?: string }).code;
    if (code === "23505" || /uq_users_nickname_active|duplicate key/i.test(error.message)) {
      return { ok: false as const, error: "이미 사용 중인 닉네임입니다" };
    }
    return { ok: false as const, error: error.message };
  }

  await writeAudit({
    adminUserId: guard.userId,
    action: "user.update_nickname",
    targetUserId: userId,
    payload: { nickname: trimmed },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { ok: true as const };
}

export type CreateUserInput = {
  email: string;
  nickname: string;
  password: string;
  plan: Plan;
  expiresInDays?: number | null;
  notificationHour?: number;
};

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function adminCreateUser(input: CreateUserInput): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const email = input.email.trim().toLowerCase();
  const nickname = input.nickname.trim();
  const password = input.password;
  const notificationHour = input.notificationHour ?? 9;

  if (!EMAIL_RX.test(email)) return { ok: false, error: "이메일 형식이 올바르지 않아요" };
  if (!nickname) return { ok: false, error: "닉네임을 입력해주세요" };
  if (nickname.length > 30) return { ok: false, error: "닉네임은 30자 이내로 입력해주세요" };
  if (!password || password.length < 8) {
    return { ok: false, error: "임시 비밀번호는 8자 이상이어야 해요" };
  }
  if (notificationHour < 8 || notificationHour > 20) {
    return { ok: false, error: "알림 시간은 8~20시 사이여야 해요" };
  }

  // 1) auth.users 생성 — 트리거가 public.users row 자동 생성
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: nickname },
  });
  if (createErr || !created.user) {
    const msg = createErr?.message ?? "사용자 생성에 실패했어요";
    if (/already.+registered|exists/i.test(msg)) {
      return { ok: false, error: "이미 가입된 이메일이에요" };
    }
    return { ok: false, error: msg };
  }

  const userId = created.user.id;
  const planExpiresAt = (() => {
    if (input.expiresInDays === null || input.expiresInDays === undefined) return null;
    const d = new Date();
    d.setDate(d.getDate() + input.expiresInDays);
    return d.toISOString();
  })();

  // 2) public.users update — 트리거 동기화 race 대비 3회 retry
  let updated = false;
  let lastErrMsg: string | null = null;
  for (let i = 0; i < 3; i++) {
    const { data, error: updErr } = await supabaseAdmin
      .from("users")
      .update({
        nickname,
        plan: input.plan,
        plan_expires_at: planExpiresAt,
        notification_hour: notificationHour,
        nickname_set: true,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id");
    if (!updErr && data && data.length > 0) {
      updated = true;
      break;
    }
    if (updErr) lastErrMsg = updErr.message;
    await new Promise((r) => setTimeout(r, 200));
  }

  if (!updated) {
    // auth는 만들어졌으나 public 동기화 실패 — audit에 기록 후 운영자에게 알림
    await writeAudit({
      adminUserId: guard.userId,
      action: "user.create_sync_failed",
      targetUserId: userId,
      payload: { email, lastErrMsg },
    });
    return { ok: false, error: "사용자 동기화 실패. 잠시 후 다시 시도해주세요" };
  }

  await writeAudit({
    adminUserId: guard.userId,
    action: "user.create",
    targetUserId: userId,
    payload: { email, nickname, plan: input.plan },
  });

  revalidatePath("/admin/users");
  return { ok: true, userId };
}

export async function adminDeleteUser(userId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  // 1) 자가 삭제 차단
  if (userId === guard.userId) {
    return { ok: false, error: "본인 계정은 삭제할 수 없어요" };
  }

  // 2) 대상 조회 + 가드
  const { data: target, error: targetErr } = await supabaseAdmin
    .from("users")
    .select("id, role, email, nickname, deleted_at")
    .eq("id", userId)
    .single();
  if (targetErr || !target) {
    return { ok: false, error: "사용자를 찾을 수 없어요" };
  }
  // 3) admin 삭제 차단
  if (target.role === "admin") {
    return {
      ok: false,
      error: "관리자 계정은 직접 삭제할 수 없어요. 권한을 user로 강등한 뒤 삭제하세요",
    };
  }
  // 4) 이미 삭제됨
  if (target.deleted_at) {
    return { ok: false, error: "이미 삭제된 사용자예요" };
  }

  // 5) public.users 소프트 삭제 + email 익명화 + 알림 중단
  const anonEmail = `${userId}@deleted.local`;
  const { error: softErr } = await supabaseAdmin
    .from("users")
    .update({
      deleted_at: new Date().toISOString(),
      email: anonEmail,
      notifications_started_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (softErr) {
    // deleted_at 컬럼 미적용 환경 안내 (42703 = undefined_column)
    const code = (softErr as { code?: string }).code;
    if (code === "42703" || /deleted_at/i.test(softErr.message)) {
      return {
        ok: false,
        error:
          "Sprint D 마이그레이션(20260527_admin_users_crud.sql)이 아직 적용되지 않았습니다. Supabase SQL Editor에서 먼저 적용해주세요.",
      };
    }
    return { ok: false, error: softErr.message };
  }

  // 6) auth.users hard delete — 동일 이메일 재가입 가능 + 세션 즉시 무효화
  // 실패해도 public.users는 이미 소프트 삭제됨. middleware가 deleted_at으로 차단.
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authErr) {
    console.error("[adminDeleteUser] auth delete failed:", authErr);
  }

  await writeAudit({
    adminUserId: guard.userId,
    action: "user.delete",
    targetUserId: userId,
    payload: { email: target.email, nickname: target.nickname },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}
