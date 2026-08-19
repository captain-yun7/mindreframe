import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getNotificationByDay } from "@/lib/notification-messages";
import { sendAlimtalk } from "@/lib/notifications/solapi";

/**
 * 알림 시작(결제/번호 등록) 직후 1일차 알림톡 즉시 발송.
 *
 * cron은 유저별 notification_hour 정각에만 돌기 때문에, 등록 시각이
 * 그 시각을 지나 있으면 1일차 메시지를 영영 못 받는 구멍을 메운다.
 * cron과 동일하게 notification_logs (user_id, day_number) 선점으로
 * 중복 발송을 막는다 — 같은 날 cron이 돌아도 unique violation으로 skip.
 *
 * best-effort: 실패해도 throw하지 않는다 (호출부의 본 작업을 막지 않음).
 */
export async function sendDayOneNotificationNow(userId: string): Promise<void> {
  const templateId = process.env.SOLAPI_ALIMTALK_TEMPLATE_ID;
  if (!templateId) return;

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("phone_number")
    .eq("id", userId)
    .single();
  const phone = (user as { phone_number?: string | null } | null)?.phone_number;
  if (!phone) return;

  let content: string | null = null;
  try {
    const { data: msg } = await supabaseAdmin
      .from("notification_messages")
      .select("content")
      .eq("day_number", 1)
      .maybeSingle();
    content = (msg as { content?: string } | null)?.content ?? null;
  } catch {
    // 테이블 미존재 등 — fallback 사용
  }
  content = content ?? getNotificationByDay(1)?.content ?? null;
  if (!content) return;

  const { error: lockErr } = await supabaseAdmin.from("notification_logs").insert({
    user_id: userId,
    day_number: 1,
    channel: "kakao_alimtalk",
    status: "pending",
  });
  if (lockErr) return; // 23505 = 이미 발송됨, 그 외 에러도 조용히 종료

  const result = await sendAlimtalk({
    to: phone.replace(/[^0-9]/g, ""),
    templateId,
    variables: { "#{day}": "1", "#{content}": content },
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
      .eq("day_number", 1);
  } else {
    await supabaseAdmin
      .from("notification_logs")
      .update({ status: "failed", error_message: result.error ?? "unknown" })
      .eq("user_id", userId)
      .eq("day_number", 1);
  }
}
