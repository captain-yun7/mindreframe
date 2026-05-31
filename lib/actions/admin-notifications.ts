"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
