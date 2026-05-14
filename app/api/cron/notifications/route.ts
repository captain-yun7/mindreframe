import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getNotificationByDay } from "@/lib/notification-messages";
import { sendAlimtalk } from "@/lib/notifications/solapi";

/**
 * 카카오 알림톡 발송 cron.
 * Vercel Cron이 매시 정각에 호출하면 — 그 시각에 발송하기로 한 유저들 추려서 발송.
 *
 * 트리거 조건 (모두 만족):
 *   - users.phone_number IS NOT NULL
 *   - users.notifications_started_at IS NOT NULL
 *   - users.notification_hour == 현재 시각(KST)
 *   - 가입(결제)일+N일차가 1~100 사이
 *   - notification_logs에 (user_id, day) 조합 없음 (중복 방지)
 *
 * 보안: Vercel Cron 호출만 허용 (`CRON_SECRET` 검증).
 */

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  phone_number: string | null;
  notification_hour: number;
  notifications_started_at: string | null;
}

export async function GET(request: Request) {
  // Vercel Cron만 허용
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const templateId = process.env.SOLAPI_ALIMTALK_TEMPLATE_ID;
  if (!templateId) {
    return NextResponse.json({ error: "SOLAPI_ALIMTALK_TEMPLATE_ID 미설정" }, { status: 500 });
  }

  // KST 현재 시(0~23)
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const currentHour = kstNow.getUTCHours();
  const today = kstNow.toISOString().slice(0, 10);

  // 발송 대상 조회 — 이 시각에 보내기로 한 유저들
  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, phone_number, notification_hour, notifications_started_at")
    .eq("notification_hour", currentHour)
    .not("phone_number", "is", null)
    .not("notifications_started_at", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const u of (users ?? []) as UserRow[]) {
    if (!u.phone_number || !u.notifications_started_at) {
      skipped++;
      continue;
    }

    // 경과 일수 (started_at 당일이 1일차)
    const start = new Date(u.notifications_started_at + "T00:00:00Z");
    const todayDate = new Date(today + "T00:00:00Z");
    const elapsedDays =
      Math.floor((todayDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (elapsedDays < 1 || elapsedDays > 100) {
      skipped++;
      continue;
    }

    const msg = getNotificationByDay(elapsedDays);
    if (!msg) {
      skipped++;
      continue;
    }

    // 중복 발송 방지 — (user, day) 조합으로 pending 행 선점
    const { error: lockErr } = await supabaseAdmin.from("notification_logs").insert({
      user_id: u.id,
      day_number: elapsedDays,
      channel: "kakao_alimtalk",
      status: "pending",
    });
    if (lockErr) {
      // unique violation = 이미 처리됨
      skipped++;
      continue;
    }

    const result = await sendAlimtalk({
      to: u.phone_number.replace(/[^0-9]/g, ""),
      templateId,
      variables: {
        "#{day}": String(elapsedDays),
        "#{content}": msg.content,
      },
    });

    if (result.ok) {
      sent++;
      await supabaseAdmin
        .from("notification_logs")
        .update({
          status: "sent",
          external_message_id: result.messageId ?? null,
          sent_at: new Date().toISOString(),
        })
        .eq("user_id", u.id)
        .eq("day_number", elapsedDays);
    } else {
      failed++;
      await supabaseAdmin
        .from("notification_logs")
        .update({
          status: "failed",
          error_message: result.error ?? "unknown",
        })
        .eq("user_id", u.id)
        .eq("day_number", elapsedDays);
    }
  }

  return NextResponse.json({
    hour: currentHour,
    candidates: users?.length ?? 0,
    sent,
    failed,
    skipped,
  });
}
