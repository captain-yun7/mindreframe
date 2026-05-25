import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizePlan, type Plan } from "@/lib/auth/plan";

/**
 * 토스페이먼츠 webhook 핸들러 — PG 심사 통과 후 활성화.
 *
 * ENV:
 *   TOSS_WEBHOOK_SECRET — 토스 콘솔의 시크릿 (서명 검증용)
 *
 * 처리 이벤트:
 *   - PAYMENT_STATUS_CHANGED: status === "DONE"이면 plan 활성화
 *   - SUBSCRIPTION_CANCELED:  현재 주기 만료까지 유지, 만료 후 cron이 free 강등
 *
 * 요청 메타데이터로 user_id, plan을 전달받는 가정. 결제 흐름에서 metadata에 채움.
 */

interface TossWebhookPayload {
  eventType: string;
  data: {
    status?: string;
    orderId?: string;
    paymentKey?: string;
    metadata?: { user_id?: string; plan?: string };
  };
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.TOSS_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-toss-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: TossWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // F91 — 토스 콘솔에서 직접 환불한 경우 DB 동기화
  if (
    payload.eventType === "PAYMENT_STATUS_CHANGED" &&
    payload.data.status === "CANCELED"
  ) {
    const orderId = payload.data.orderId;
    if (orderId) {
      const { data: paymentRow } = await supabaseAdmin
        .from("payments")
        .select("id, user_id, status")
        .eq("order_id", orderId)
        .maybeSingle();
      if (paymentRow && (paymentRow as { status?: string }).status !== "refunded") {
        await supabaseAdmin
          .from("payments")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
            refund_reason: "토스 webhook 동기화",
          })
          .eq("id", (paymentRow as { id: string }).id);
        // 사용자 plan 강등은 어드민 수동 처리에 맡김 (webhook만으로 자동 강등 시 항의 대응 어려움)
      }
    }
    return NextResponse.json({ ok: true, type: "canceled_synced" });
  }

  if (
    payload.eventType !== "PAYMENT_STATUS_CHANGED" ||
    payload.data.status !== "DONE"
  ) {
    return NextResponse.json({ ok: true, ignored: payload.eventType });
  }

  const userId = payload.data.metadata?.user_id;
  const plan: Plan = normalizePlan(payload.data.metadata?.plan);
  if (!userId) {
    return NextResponse.json({ error: "missing_user_id" }, { status: 400 });
  }

  // 100일 plan 기간 부여
  const expires = new Date();
  expires.setDate(expires.getDate() + 100);

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      plan,
      plan_expires_at: expires.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId, plan });
}
