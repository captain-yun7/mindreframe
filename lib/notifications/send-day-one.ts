import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getNotificationByDay } from "@/lib/notification-messages";
import { sendAlimtalk } from "@/lib/notifications/solapi";
import { computeDayNumber } from "@/lib/coach/day-number";

/**
 * 알림 시작(결제/번호 등록) 직후 "현재 일차" 알림톡 즉시 발송.
 *
 * 일차는 결제일(plan_started_at) 기준 — 화면 차수와 동일 (2026-08-26 고객 결정).
 * 예: 결제 8/17, 번호 등록 8/26 → 10일차 메시지가 즉시 발송됨.
 * plan_started_at 없는 유저는 등록일 기준(=1일차).
 *
 * cron은 유저별 notification_hour 정각에만 돌기 때문에, 등록 시각이
 * 그 시각을 지나 있으면 당일 메시지를 영영 못 받는 구멍을 메운다.
 * cron과 동일하게 notification_logs (user_id, day_number) 선점으로
 * 중복 발송을 막는다 — 같은 날 cron이 돌아도 unique violation으로 skip.
 *
 * best-effort: 실패해도 throw하지 않는다 (호출부의 본 작업을 막지 않음).
 */
export async function sendDayOneNotificationNow(userId: string): Promise<void> {
  const templateId = process.env.SOLAPI_ALIMTALK_TEMPLATE_ID;
  if (!templateId) return;

  let phone: string | null = null;
  let day: number | null = null;
  {
    const res = await supabaseAdmin
      .from("users")
      .select("phone_number, notifications_started_at, plan_started_at")
      .eq("id", userId)
      .single();
    let row = res.data as {
      phone_number?: string | null;
      notifications_started_at?: string | null;
      plan_started_at?: string | null;
    } | null;
    if (res.error && (res.error.code === "42703" || /plan_started_at/.test(res.error.message))) {
      const r2 = await supabaseAdmin
        .from("users")
        .select("phone_number, notifications_started_at")
        .eq("id", userId)
        .single();
      row = r2.data as typeof row;
    }
    phone = row?.phone_number ?? null;
    day =
      computeDayNumber(row?.plan_started_at) ??
      computeDayNumber(row?.notifications_started_at) ??
      1;
  }
  if (!phone || !day) return;

  let content: string | null = null;
  try {
    const { data: msg } = await supabaseAdmin
      .from("notification_messages")
      .select("content")
      .eq("day_number", day)
      .maybeSingle();
    content = (msg as { content?: string } | null)?.content ?? null;
  } catch {
    // 테이블 미존재 등 — fallback 사용
  }
  content = content ?? getNotificationByDay(day)?.content ?? null;
  if (!content) return;

  const { error: lockErr } = await supabaseAdmin.from("notification_logs").insert({
    user_id: userId,
    day_number: day,
    channel: "kakao_alimtalk",
    status: "pending",
  });
  if (lockErr) return; // 23505 = 이미 발송됨, 그 외 에러도 조용히 종료

  const result = await sendAlimtalk({
    to: phone.replace(/[^0-9]/g, ""),
    templateId,
    variables: { "#{day}": String(day), "#{content}": content },
  });

  if (result.ok) {
    await supabaseAdmin
      .from("notification_logs")
      .update({
        status: "sent",
        external_message_id: result.messageId ?? null,
        sent_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("day_number", day);
  } else {
    await supabaseAdmin
      .from("notification_logs")
      .update({ status: "failed", error_message: result.error ?? "unknown" })
      .eq("user_id", userId)
      .eq("day_number", day);
  }
}
