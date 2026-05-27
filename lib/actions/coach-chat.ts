"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getCoachWeeklyLimit, normalizePlan, type Plan } from "@/lib/auth/plan";
import { writeAudit } from "./_audit";

export type CoachMessage = {
  id: string;
  sender_role: "user" | "coach";
  content: string;
  created_at: string;
  session_id: string;
};

export type CoachSessionSummary = {
  id: string;
  status: "active" | "ended";
  started_at: string;
  ended_at: string | null;
  coach_id: string | null;
  ended_by: string | null;
};

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };
  return { ok: true as const, supabase, user };
}

type AnySupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function pickDefaultCoachId(sb: AnySupabase): Promise<string | null> {
  if (process.env.DEFAULT_COACH_USER_ID) return process.env.DEFAULT_COACH_USER_ID;
  const { data } = await sb
    .from("users")
    .select("id")
    .eq("role", "coach")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

/** 새 세션 시작 — 활성 세션 1개 + 주간 한도 검증 + 단일 코치 자동 배정. */
export async function startCoachSession() {
  const r = await requireUser();
  if (!r.ok) return { ok: false as const, error: r.error };

  const { data: userRow } = await r.supabase
    .from("users")
    .select("plan")
    .eq("id", r.user.id)
    .single();
  const plan: Plan = normalizePlan(userRow?.plan);
  const limit = getCoachWeeklyLimit(plan);
  if (limit === 0) {
    return { ok: false as const, error: "라이트 이상 플랜에서만 코치 채팅을 이용할 수 있어요" };
  }

  // 활성 세션 있으면 그것 반환
  const { data: active } = await r.supabase
    .from("coach_chat_sessions")
    .select("id")
    .eq("user_id", r.user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (active) return { ok: true as const, sessionId: active.id };

  // 주간 카운트 RPC
  const { data: usedRaw } = await r.supabase.rpc("count_coach_sessions_this_week", {
    p_user_id: r.user.id,
  });
  const used = (usedRaw as number | null) ?? 0;
  if (used >= limit) {
    return {
      ok: false as const,
      error: `이번 주 코치 채팅 ${limit}회를 모두 사용했어요. 다음 주에 다시 시작할 수 있어요`,
    };
  }

  // 코치 자동 배정
  const coachId = await pickDefaultCoachId(r.supabase);

  const { data: created, error } = await r.supabase
    .from("coach_chat_sessions")
    .insert({ user_id: r.user.id, coach_id: coachId })
    .select("id")
    .single();

  // coach_id 컬럼 부재 fallback
  if (error && (error.code === "42703" || /coach_id/.test(error.message))) {
    const { data: c2, error: e2 } = await r.supabase
      .from("coach_chat_sessions")
      .insert({ user_id: r.user.id })
      .select("id")
      .single();
    if (e2 || !c2) return { ok: false as const, error: "세션을 시작하지 못했어요" };
    revalidatePath("/coach");
    return { ok: true as const, sessionId: c2.id };
  }

  if (error || !created) return { ok: false as const, error: "세션을 시작하지 못했어요" };
  revalidatePath("/coach");
  return { ok: true as const, sessionId: created.id };
}

/** 세션 종료 — 코치/admin만 가능. */
export async function endCoachSession(sessionId: string) {
  const c = await requireCoachOrAdmin();
  if (!c.ok) return { ok: false as const, error: c.error };

  const nowIso = new Date().toISOString();
  let { error } = await c.supabase
    .from("coach_chat_sessions")
    .update({
      status: "ended",
      ended_at: nowIso,
      ended_by: c.user.id,
    })
    .eq("id", sessionId);

  // ended_by 컬럼 부재 fallback
  if (error && (error.code === "42703" || /ended_by/.test(error.message))) {
    const r2 = await c.supabase
      .from("coach_chat_sessions")
      .update({ status: "ended", ended_at: nowIso })
      .eq("id", sessionId);
    error = r2.error;
  }
  if (error) return { ok: false as const, error: "세션을 종료하지 못했어요" };

  await writeAudit({
    adminUserId: c.user.id,
    action: "coach.end_session",
    payload: { session_id: sessionId },
  });

  revalidatePath("/coach");
  revalidatePath("/admin/coach");
  revalidatePath(`/admin/coach/${sessionId}`);
  return { ok: true as const };
}

/** 유저용 메시지 전송. 상담사 전용은 sendCoachReply 사용. INSERT 결과 row 반환. */
export async function sendCoachMessage(sessionId: string, content: string) {
  const r = await requireUser();
  if (!r.ok) return { ok: false as const, error: r.error };
  const trimmed = content.trim();
  if (!trimmed) return { ok: false as const, error: "메시지를 입력해주세요" };

  const { data, error } = await r.supabase
    .from("coach_chat_messages")
    .insert({
      session_id: sessionId,
      sender_id: r.user.id,
      sender_role: "user",
      content: trimmed,
    })
    .select("id, sender_role, content, created_at, session_id")
    .single();
  if (error || !data) return { ok: false as const, error: "메시지 전송에 실패했어요" };

  // E-2: 코치에게 텔레그램 알림 (best-effort, fire-and-forget)
  notifyCoachOfUserMessage(sessionId, r.user.id, trimmed).catch((e) => {
    console.error("[sendCoachMessage] telegram notify failed:", e);
  });

  revalidatePath("/coach");
  revalidatePath(`/admin/coach/${sessionId}`);
  return { ok: true as const, message: data as CoachMessage };
}

/**
 * 사용자 발화 시 매칭된 코치(혹은 단일 운영자)에게 텔레그램 알림 발송.
 *
 * - 이미 코치 응답이 있었던 세션이면 알림 skip (스팸 방지: first_coach_reply_at)
 * - 코치 telegram_chat_id 부재 시 TELEGRAM_DEFAULT_CHAT_ID로 fallback
 * - TELEGRAM_BOT_TOKEN 부재 시 wrapper가 즉시 skip
 * - 컬럼(coach_id / first_coach_reply_at) 부재 시 단일 운영자 fallback으로 동작
 */
async function notifyCoachOfUserMessage(
  sessionId: string,
  userId: string,
  preview: string,
) {
  const { supabaseAdmin } = await import("@/lib/supabase-admin");
  const { sendTelegramMessage } = await import("@/lib/notifications/telegram");

  let session: {
    coach_id: string | null;
    first_coach_reply_at: string | null;
  } | null = null;
  {
    const res = await supabaseAdmin
      .from("coach_chat_sessions")
      .select("coach_id, first_coach_reply_at")
      .eq("id", sessionId)
      .single();
    if (res.error) {
      const msg = res.error.message ?? "";
      if (res.error.code === "42703" || /coach_id|first_coach_reply_at/.test(msg)) {
        // E-1 마이그 미적용 환경 — 단일 운영자 fallback으로만 발송
        session = { coach_id: null, first_coach_reply_at: null };
      } else {
        return;
      }
    } else {
      session = res.data as {
        coach_id: string | null;
        first_coach_reply_at: string | null;
      };
    }
  }
  if (!session) return;
  if (session.first_coach_reply_at) return; // 스팸 방지

  // 사용자 닉네임 + 코치 chat_id 조회
  const userPromise = supabaseAdmin
    .from("users")
    .select("nickname")
    .eq("id", userId)
    .single();
  const coachPromise = session.coach_id
    ? supabaseAdmin
        .from("users")
        .select("telegram_chat_id")
        .eq("id", session.coach_id)
        .single()
    : Promise.resolve({ data: null, error: null });

  const [userRes, coachRes] = await Promise.all([userPromise, coachPromise]);
  const nickname =
    (userRes.data as { nickname?: string } | null)?.nickname ?? "사용자";
  const coachChatId =
    (coachRes.data as { telegram_chat_id?: string | null } | null)
      ?.telegram_chat_id ?? null;

  const sitePrefix =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://mindreframe.net";
  const link = `${sitePrefix}/admin/coach/${sessionId}`;
  const safePreview =
    preview.length > 80 ? preview.slice(0, 80) + "…" : preview;
  const text = [
    `*새 문의 도착*`,
    `${nickname}님이 코치 채팅을 시작했어요.`,
    ``,
    safePreview,
    ``,
    `[답변하기](${link})`,
  ].join("\n");

  await sendTelegramMessage({ text, chatId: coachChatId });
}

// ─── 상담사 전용 ───

async function requireCoach() {
  const r = await requireUser();
  if (!r.ok) return { ok: false as const, error: r.error };
  const { data: u } = await r.supabase
    .from("users")
    .select("role")
    .eq("id", r.user.id)
    .single();
  if (u?.role !== "coach" && u?.role !== "admin") {
    return { ok: false as const, error: "코치 권한이 필요해요" };
  }
  return { ok: true as const, supabase: r.supabase, user: r.user };
}

/** 모니터링 + 답변 권한 (coach 또는 admin). */
async function requireCoachOrAdmin() {
  const r = await requireUser();
  if (!r.ok) return { ok: false as const, error: r.error };
  const { data: u } = await r.supabase
    .from("users")
    .select("role")
    .eq("id", r.user.id)
    .single();
  if (u?.role !== "coach" && u?.role !== "admin") {
    return { ok: false as const, error: "코치 또는 관리자 권한이 필요해요" };
  }
  return { ok: true as const, supabase: r.supabase, user: r.user };
}

export type CoachActiveSession = {
  id: string;
  user_id: string;
  nickname: string;
  plan: string;
  started_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  coach_warning: "red" | null;
};

/** 상담사·관리자 어드민 대시보드용 — 활성 세션 목록 + 최근 메시지 미리보기 + 회원 플랜 + F87 빨간 경고. */
export async function listActiveSessionsForCoach() {
  const c = await requireCoachOrAdmin();
  if (!c.ok) return { ok: false as const, error: c.error };

  // 삭제된 사용자의 세션은 제외 (best-effort — deleted_at 컬럼 미적용 환경 fallback)
  let sessionsRaw: Array<{
    id: string;
    user_id: string;
    started_at: string;
    users: { nickname?: string; plan?: string; deleted_at?: string | null } | null;
  }> | null = null;
  {
    const res = await c.supabase
      .from("coach_chat_sessions")
      .select(
        "id, user_id, started_at, users:user_id (nickname, plan, deleted_at)",
      )
      .eq("status", "active")
      .order("started_at", { ascending: false });
    if (
      res.error &&
      (res.error.code === "42703" || /deleted_at/.test(res.error.message))
    ) {
      const r2 = await c.supabase
        .from("coach_chat_sessions")
        .select("id, user_id, started_at, users:user_id (nickname, plan)")
        .eq("status", "active")
        .order("started_at", { ascending: false });
      sessionsRaw =
        (r2.data as Array<{
          id: string;
          user_id: string;
          started_at: string;
          users: { nickname?: string; plan?: string } | null;
        }> | null) ?? null;
    } else {
      sessionsRaw =
        (res.data as Array<{
          id: string;
          user_id: string;
          started_at: string;
          users: {
            nickname?: string;
            plan?: string;
            deleted_at?: string | null;
          } | null;
        }> | null) ?? null;
    }
  }

  const sessions = (sessionsRaw ?? []).filter((s) => {
    const u = s.users as { deleted_at?: string | null } | null;
    return !u?.deleted_at;
  });

  if (sessions.length === 0) {
    return { ok: true as const, sessions: [] as CoachActiveSession[] };
  }

  // F87 빨간 경고 — 활성 세션 사용자들의 이번 주 코치 사용량
  const {
    getCoachWarningLevel,
    daysSinceWeekStartKst,
    mondayStartIsoKst,
  } = await import("@/lib/admin/coach-warning");
  const monday = mondayStartIsoKst();
  const daysIntoWeek = daysSinceWeekStartKst();
  const userIds = Array.from(new Set(sessions.map((s) => s.user_id)));
  const weeklyMap = new Map<string, number>();
  if (userIds.length > 0) {
    const { data: weekly } = await c.supabase
      .from("coach_chat_sessions")
      .select("user_id")
      .in("user_id", userIds)
      .gte("started_at", monday);
    for (const w of (weekly ?? []) as { user_id: string }[]) {
      weeklyMap.set(w.user_id, (weeklyMap.get(w.user_id) ?? 0) + 1);
    }
  }

  const results: CoachActiveSession[] = await Promise.all(
    sessions.map(async (s) => {
      const { data: last } = await c.supabase
        .from("coach_chat_messages")
        .select("content, created_at")
        .eq("session_id", s.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const u = s.users as { nickname?: string; plan?: string } | null;
      const plan = u?.plan ?? "free";
      const sessionsThisWeek = weeklyMap.get(s.user_id) ?? 0;
      return {
        id: s.id,
        user_id: s.user_id,
        nickname: u?.nickname ?? "사용자",
        plan,
        started_at: s.started_at,
        last_message_at: last?.created_at ?? null,
        last_message_preview: last?.content ? last.content.slice(0, 60) : null,
        coach_warning: getCoachWarningLevel(plan, daysIntoWeek, sessionsThisWeek),
      };
    }),
  );

  return { ok: true as const, sessions: results };
}

export async function sendCoachReply(sessionId: string, content: string) {
  const c = await requireCoach();
  if (!c.ok) return { ok: false as const, error: c.error };
  const trimmed = content.trim();
  if (!trimmed) return { ok: false as const, error: "메시지를 입력해주세요" };

  const { data, error } = await c.supabase
    .from("coach_chat_messages")
    .insert({
      session_id: sessionId,
      sender_id: c.user.id,
      sender_role: "coach",
      content: trimmed,
    })
    .select("id, sender_role, content, created_at, session_id")
    .single();
  if (error || !data) return { ok: false as const, error: "답변 전송에 실패했어요" };

  // first_coach_reply_at 멱등 업데이트 (best-effort, 컬럼 부재 시 무시)
  try {
    await c.supabase
      .from("coach_chat_sessions")
      .update({ first_coach_reply_at: new Date().toISOString() })
      .eq("id", sessionId)
      .is("first_coach_reply_at", null);
  } catch {
    // ignore (컬럼 부재 등)
  }

  // 답변 알림 — 유저의 phone_number가 있으면 알림톡 발송 (실패해도 답변 자체는 성공)
  notifyUserOfCoachReply(sessionId).catch((e) => {
    console.error("coach reply notification failed:", e);
  });

  revalidatePath("/coach");
  revalidatePath(`/admin/coach/${sessionId}`);
  revalidatePath("/admin/coach");
  return { ok: true as const, message: data as CoachMessage };
}

/** 사용자의 모든 세션 + 메시지 (어드민 단일 스레드 뷰 용). */
export type CoachThread = {
  sessions: CoachSessionSummary[];
  messages: CoachMessage[];
  activeSession: CoachSessionSummary | null;
};

export async function getCoachThreadForUser(
  userId: string,
): Promise<{ ok: true; thread: CoachThread } | { ok: false; error: string }> {
  const c = await requireCoachOrAdmin();
  if (!c.ok) return { ok: false, error: c.error };

  let sessions: CoachSessionSummary[] = [];
  {
    const res = await c.supabase
      .from("coach_chat_sessions")
      .select("id, status, started_at, ended_at, coach_id, ended_by")
      .eq("user_id", userId)
      .order("started_at", { ascending: true });
    if (
      res.error &&
      (res.error.code === "42703" ||
        /coach_id|ended_by/.test(res.error.message))
    ) {
      const r2 = await c.supabase
        .from("coach_chat_sessions")
        .select("id, status, started_at, ended_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: true });
      sessions = ((r2.data ?? []) as Array<{
        id: string;
        status: "active" | "ended";
        started_at: string;
        ended_at: string | null;
      }>).map((s) => ({ ...s, coach_id: null, ended_by: null }));
    } else if (res.error) {
      return { ok: false, error: res.error.message };
    } else {
      sessions = (res.data ?? []) as CoachSessionSummary[];
    }
  }

  const sessionIds = sessions.map((s) => s.id);
  let messages: CoachMessage[] = [];
  if (sessionIds.length > 0) {
    const { data: msgs } = await c.supabase
      .from("coach_chat_messages")
      .select("id, sender_role, content, created_at, session_id")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: true })
      .limit(500);
    messages = (msgs ?? []) as CoachMessage[];
  }

  const activeSession = sessions.find((s) => s.status === "active") ?? null;
  return { ok: true, thread: { sessions, messages, activeSession } };
}

/** 본인 사용자 단일 스레드 — /coach 페이지 용. */
export async function getMyCoachThread(): Promise<
  | {
      ok: true;
      sessions: CoachSessionSummary[];
      messages: CoachMessage[];
      activeSession: CoachSessionSummary | null;
    }
  | { ok: false; error: string }
> {
  const r = await requireUser();
  if (!r.ok) return { ok: false, error: r.error };

  let sessions: CoachSessionSummary[] = [];
  {
    const res = await r.supabase
      .from("coach_chat_sessions")
      .select("id, status, started_at, ended_at, coach_id, ended_by")
      .eq("user_id", r.user.id)
      .order("started_at", { ascending: true });
    if (
      res.error &&
      (res.error.code === "42703" ||
        /coach_id|ended_by/.test(res.error.message))
    ) {
      const r2 = await r.supabase
        .from("coach_chat_sessions")
        .select("id, status, started_at, ended_at")
        .eq("user_id", r.user.id)
        .order("started_at", { ascending: true });
      sessions = ((r2.data ?? []) as Array<{
        id: string;
        status: "active" | "ended";
        started_at: string;
        ended_at: string | null;
      }>).map((s) => ({ ...s, coach_id: null, ended_by: null }));
    } else if (res.error) {
      return { ok: false, error: res.error.message };
    } else {
      sessions = (res.data ?? []) as CoachSessionSummary[];
    }
  }

  const ids = sessions.map((s) => s.id);
  let messages: CoachMessage[] = [];
  if (ids.length > 0) {
    const { data: msgs } = await r.supabase
      .from("coach_chat_messages")
      .select("id, sender_role, content, created_at, session_id")
      .in("session_id", ids)
      .order("created_at", { ascending: true })
      .limit(500);
    messages = (msgs ?? []) as CoachMessage[];
  }

  const activeSession = sessions.find((s) => s.status === "active") ?? null;
  return { ok: true, sessions, messages, activeSession };
}

/** 코치/admin이 사용자의 주간 코치 세션 카운트를 수동 조정 (±1). */
export async function adminAdjustCoachSession(userId: string, delta: number) {
  const c = await requireCoachOrAdmin();
  if (!c.ok) return { ok: false as const, error: c.error };

  if (delta !== 1 && delta !== -1) {
    return { ok: false as const, error: "조정값은 ±1만 가능해요" };
  }

  const { supabaseAdmin } = await import("@/lib/supabase-admin");
  const { data: u, error: e1 } = await supabaseAdmin
    .from("users")
    .select("coach_session_adjustment")
    .eq("id", userId)
    .single();
  if (e1) {
    if (e1.code === "42703" || /coach_session_adjustment/.test(e1.message)) {
      return {
        ok: false as const,
        error: "마이그레이션 적용 후 사용 가능해요",
      };
    }
    return { ok: false as const, error: e1.message };
  }
  if (!u) return { ok: false as const, error: "사용자를 찾을 수 없어요" };

  const current =
    ((u as { coach_session_adjustment?: number | null }).coach_session_adjustment as
      | number
      | null) ?? 0;
  const next = current + delta;

  const { error: e2 } = await supabaseAdmin
    .from("users")
    .update({
      coach_session_adjustment: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (e2) {
    if (e2.code === "42703" || /coach_session_adjustment/.test(e2.message)) {
      return {
        ok: false as const,
        error: "마이그레이션 적용 후 사용 가능해요",
      };
    }
    return { ok: false as const, error: e2.message };
  }

  await writeAudit({
    adminUserId: c.user.id,
    action: "coach.adjust_session",
    targetUserId: userId,
    payload: { delta, prev: current, next },
  });

  revalidatePath(`/admin/coach`);
  return { ok: true as const, next };
}

async function notifyUserOfCoachReply(sessionId: string) {
  const { supabaseAdmin } = await import("@/lib/supabase-admin");
  const { sendAlimtalk } = await import("@/lib/notifications/solapi");

  const templateId = process.env.SOLAPI_ALIMTALK_REPLY_TEMPLATE_ID;
  if (!templateId) {
    // 코치 답변 알림톡 템플릿 미설정 시 발송 생략 (검수 통과 전)
    return;
  }

  const { data: session } = await supabaseAdmin
    .from("coach_chat_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();
  if (!session) return;

  // deleted_at 컬럼 fallback — 컬럼 미적용 환경에선 단순 select
  let phone: string | null = null;
  {
    const res = await supabaseAdmin
      .from("users")
      .select("phone_number, deleted_at")
      .eq("id", session.user_id)
      .single();
    if (
      res.error &&
      (res.error.code === "42703" || /deleted_at/.test(res.error.message))
    ) {
      const r2 = await supabaseAdmin
        .from("users")
        .select("phone_number")
        .eq("id", session.user_id)
        .single();
      phone = (r2.data as { phone_number?: string | null } | null)?.phone_number ?? null;
    } else {
      const data = res.data as { phone_number?: string | null; deleted_at?: string | null } | null;
      if (data?.deleted_at) return; // 삭제된 사용자에겐 알림 안 보냄
      phone = data?.phone_number ?? null;
    }
  }
  if (!phone) return;

  await sendAlimtalk({
    to: phone.replace(/[^0-9]/g, ""),
    templateId,
    variables: {},
  });
}
