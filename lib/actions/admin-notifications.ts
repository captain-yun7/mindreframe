"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sendAlimtalk } from "@/lib/notifications/solapi";
import { writeAudit } from "./_audit";

async function ensureAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };
  if (user.email === "mindtheater00@gmail.com") return { ok: true, userId: user.id };
  const { data: u } = await sb.from("users").select("role").eq("id", user.id).single();
  if (u?.role !== "admin") return { ok: false, error: "관리자 권한이 필요합니다" };
  return { ok: true, userId: user.id };
}

/**
 * 실패(또는 임의) 알림 로그 1건 재발송.
 * cron 발송 로직과 동일한 템플릿/변수로 다시 보내고, 같은 로그 row를 갱신한다.
 */
export async function adminResendNotification(logId: string) {
  const g = await ensureAdmin();
  if (!g.ok) return g;

  const { data: log, error: logErr } = await supabaseAdmin
    .from("notification_logs")
    .select("id, user_id, day_number, channel")
    .eq("id", logId)
    .single();
  if (logErr || !log) return { ok: false as const, error: "발송 로그를 찾을 수 없어요" };

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("phone_number")
    .eq("id", log.user_id)
    .single();
  const phone = (user as { phone_number?: string | null } | null)?.phone_number;
  if (!phone) return { ok: false as const, error: "사용자 휴대폰 번호가 없어요" };

  const { data: msg } = await supabaseAdmin
    .from("notification_messages")
    .select("content")
    .eq("day_number", log.day_number)
    .single();
  const content = (msg as { content?: string } | null)?.content;
  if (!content) {
    return { ok: false as const, error: `${log.day_number}일차 메시지 본문이 없어요` };
  }

  const templateId = process.env.SOLAPI_ALIMTALK_TEMPLATE_ID;
  if (!templateId) return { ok: false as const, error: "알림톡 템플릿 미설정" };

  const result = await sendAlimtalk({
    to: phone.replace(/[^0-9]/g, ""),
    templateId,
    variables: { "#{day}": String(log.day_number), "#{content}": content },
  });

  if (result.ok) {
    await supabaseAdmin
      .from("notification_logs")
      .update({
        status: "sent",
        external_message_id: result.messageId ?? null,
        error_message: null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", logId);
  } else {
    await supabaseAdmin
      .from("notification_logs")
      .update({ status: "failed", error_message: result.error ?? "unknown" })
      .eq("id", logId);
  }

  await writeAudit({
    adminUserId: g.userId,
    action: "notification.resend",
    targetUserId: log.user_id,
    payload: { logId, dayNumber: log.day_number, ok: result.ok },
  });

  revalidatePath("/admin/notifications");
  return result.ok
    ? { ok: true as const }
    : { ok: false as const, error: result.error ?? "발송 실패" };
}

export interface NotificationMessageInput {
  dayNumber: number;
  title?: string | null;
  content: string;
}

export async function adminUpdateNotificationMessage(input: NotificationMessageInput) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  if (!Number.isInteger(input.dayNumber) || input.dayNumber < 1 || input.dayNumber > 100) {
    return { ok: false as const, error: "day_number는 1~100" };
  }
  if (!input.content || input.content.trim().length === 0) {
    return { ok: false as const, error: "본문은 필수" };
  }
  if (input.content.length > 200) {
    return { ok: false as const, error: "본문은 200자 이내 (알림톡 변수 제약)" };
  }
  if (input.title && input.title.length > 80) {
    return { ok: false as const, error: "제목은 80자 이내" };
  }

  const { error } = await supabaseAdmin.from("notification_messages").upsert({
    day_number: input.dayNumber,
    title: input.title ?? null,
    content: input.content,
    updated_by: guard.userId,
  });
  if (error) return { ok: false as const, error: error.message };

  await writeAudit({
    adminUserId: guard.userId,
    action: "notification_message.update",
    payload: { dayNumber: input.dayNumber },
  });

  revalidatePath("/admin/notifications/messages");
  return { ok: true as const };
}

/**
 * F242 — 검수 통과 알림톡 템플릿 목록 조회 (드롭다운용).
 */
export async function adminListAlimtalkTemplates() {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;
  const { listAlimtalkTemplates } = await import("@/lib/notifications/solapi");
  return listAlimtalkTemplates();
}

/**
 * F240 — 관리자 테스트 발송. SMS 또는 알림톡(템플릿) 즉시 발송.
 *  - kind="sms"        : 일반 SMS (검수 불필요)
 *  - kind="alimtalk"   : 카카오 알림톡 (검수 통과 템플릿 필요)
 * 변수는 JSON 문자열로 받음. 빈 객체도 허용.
 */
export async function adminSendTestNotification(input: {
  kind: "sms" | "alimtalk";
  to: string;
  text?: string;          // SMS용 본문
  templateId?: string;    // alimtalk용 템플릿 ID
  variables?: string;     // alimtalk용 JSON 문자열
}) {
  const guard = await ensureAdmin();
  if (!guard.ok) return guard;

  const cleanedPhone = input.to.replace(/[^0-9]/g, "");
  if (!/^01[0-9]{8,9}$/.test(cleanedPhone)) {
    return { ok: false as const, error: "수신 번호 형식이 올바르지 않아요 (01012345678)" };
  }

  try {
    if (input.kind === "sms") {
      const text = (input.text ?? "").trim();
      if (!text) return { ok: false as const, error: "본문을 입력해주세요" };
      const { sendSms } = await import("@/lib/notifications/solapi");
      const r = await sendSms({ to: cleanedPhone, text });
      if (!r.ok) return { ok: false as const, error: r.error ?? "SMS 발송 실패" };
      return { ok: true as const, messageId: r.messageId ?? "", kind: "sms" as const };
    }

    // alimtalk
    const templateId = (input.templateId ?? "").trim();
    if (!templateId) return { ok: false as const, error: "템플릿 ID를 입력해주세요" };
    let variables: Record<string, string> = {};
    if (input.variables && input.variables.trim()) {
      try {
        const parsed = JSON.parse(input.variables);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          variables = Object.fromEntries(
            Object.entries(parsed).map(([k, v]) => [k, String(v)]),
          );
        }
      } catch {
        return { ok: false as const, error: "variables는 JSON 형식이어야 해요" };
      }
    }
    const { sendAlimtalk } = await import("@/lib/notifications/solapi");
    const r = await sendAlimtalk({ to: cleanedPhone, templateId, variables });
    if (!r.ok) return { ok: false as const, error: r.error ?? "알림톡 발송 실패" };
    return { ok: true as const, messageId: r.messageId ?? "", kind: "alimtalk" as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return { ok: false as const, error: msg };
  }
}
