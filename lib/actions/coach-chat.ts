"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getCoachWeeklyLimit, normalizePlan, type Plan } from "@/lib/auth/plan";

export type CoachMessage = {
  id: string;
  sender_role: "user" | "coach";
  content: string;
  created_at: string;
};

export type CoachSessionSummary = {
  id: string;
  status: "active" | "ended";
  started_at: string;
  ended_at: string | null;
};

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };
  return { ok: true as const, supabase, user };
}

export async function getMyCoachSessions() {
  const r = await requireUser();
  if (!r.ok) return { ok: false as const, error: r.error };
  const { data } = await r.supabase
    .from("coach_chat_sessions")
    .select("id, status, started_at, ended_at")
    .eq("user_id", r.user.id)
    .order("started_at", { ascending: false })
    .limit(20);
  return { ok: true as const, sessions: (data ?? []) as CoachSessionSummary[] };
}

/** 새 세션 시작 — 활성 세션 1개 + 주간 한도 검증. */
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
    return { ok: false as const, error: "프로 이상 플랜에서만 코치 채팅을 이용할 수 있어요" };
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

  const { data: created, error } = await r.supabase
    .from("coach_chat_sessions")
    .insert({ user_id: r.user.id })
    .select("id")
    .single();
  if (error || !created) return { ok: false as const, error: "세션을 시작하지 못했어요" };

  revalidatePath("/coach");
  return { ok: true as const, sessionId: created.id };
}

export async function endCoachSession(sessionId: string) {
  const r = await requireUser();
  if (!r.ok) return { ok: false as const, error: r.error };

  const { error } = await r.supabase
    .from("coach_chat_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) return { ok: false as const, error: "세션을 종료하지 못했어요" };

  revalidatePath("/coach");
  revalidatePath("/admin/coach");
  return { ok: true as const };
}

export async function getCoachMessages(sessionId: string) {
  const r = await requireUser();
  if (!r.ok) return { ok: false as const, error: r.error };
  const { data, error } = await r.supabase
    .from("coach_chat_messages")
    .select("id, sender_role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) return { ok: false as const, error: "메시지를 불러오지 못했어요" };
  return { ok: true as const, messages: (data ?? []) as CoachMessage[] };
}

/** 유저용 메시지 전송. 상담사 전용은 sendCoachReply 사용. */
export async function sendCoachMessage(sessionId: string, content: string) {
  const r = await requireUser();
  if (!r.ok) return { ok: false as const, error: r.error };
  const trimmed = content.trim();
  if (!trimmed) return { ok: false as const, error: "메시지를 입력해주세요" };

  const { error } = await r.supabase.from("coach_chat_messages").insert({
    session_id: sessionId,
    sender_id: r.user.id,
    sender_role: "user",
    content: trimmed,
  });
  if (error) return { ok: false as const, error: "메시지 전송에 실패했어요" };

  revalidatePath("/coach");
  revalidatePath(`/admin/coach/${sessionId}`);
  return { ok: true as const };
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
  if (u?.role !== "coach") {
    return { ok: false as const, error: "상담사 권한이 필요해요" };
  }
  return { ok: true as const, supabase: r.supabase, user: r.user };
}

export type CoachActiveSession = {
  id: string;
  user_id: string;
  nickname: string;
  started_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
};

/** 상담사 어드민 대시보드용 — 활성 세션 목록 + 최근 메시지 미리보기. */
export async function listActiveSessionsForCoach() {
  const c = await requireCoach();
  if (!c.ok) return { ok: false as const, error: c.error };

  const { data: sessions } = await c.supabase
    .from("coach_chat_sessions")
    .select("id, user_id, started_at, users:user_id (nickname)")
    .eq("status", "active")
    .order("started_at", { ascending: false });

  if (!sessions) return { ok: true as const, sessions: [] as CoachActiveSession[] };

  // 각 세션의 마지막 메시지 미리보기
  const results: CoachActiveSession[] = await Promise.all(
    sessions.map(async (s) => {
      const { data: last } = await c.supabase
        .from("coach_chat_messages")
        .select("content, created_at")
        .eq("session_id", s.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nickname = (s.users as { nickname?: string } | null)?.nickname ?? "사용자";
      return {
        id: s.id,
        user_id: s.user_id,
        nickname,
        started_at: s.started_at,
        last_message_at: last?.created_at ?? null,
        last_message_preview: last?.content ? last.content.slice(0, 60) : null,
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

  const { error } = await c.supabase.from("coach_chat_messages").insert({
    session_id: sessionId,
    sender_id: c.user.id,
    sender_role: "coach",
    content: trimmed,
  });
  if (error) return { ok: false as const, error: "답변 전송에 실패했어요" };

  // 답변 알림 SMS — 유저의 phone_number가 있으면 발송 (실패해도 답변 자체는 성공)
  notifyUserOfCoachReply(sessionId).catch((e) => {
    console.error("coach reply notification failed:", e);
  });

  revalidatePath("/coach");
  revalidatePath(`/admin/coach/${sessionId}`);
  revalidatePath("/admin/coach");
  return { ok: true as const };
}

async function notifyUserOfCoachReply(sessionId: string) {
  const { supabaseAdmin } = await import("@/lib/supabase-admin");
  const { sendSms } = await import("@/lib/notifications/solapi");

  const { data: session } = await supabaseAdmin
    .from("coach_chat_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();
  if (!session) return;

  const { data: u } = await supabaseAdmin
    .from("users")
    .select("phone_number")
    .eq("id", session.user_id)
    .single();
  const phone = u?.phone_number;
  if (!phone) return;

  await sendSms({
    to: phone.replace(/[^0-9]/g, ""),
    text: "[가짜생각] 상담사가 답변을 보냈어요. 앱에서 확인해주세요.\nhttps://mindreframe.net/coach",
  });
}
