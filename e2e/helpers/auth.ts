import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export type TestUser = { id: string; email: string; password: string };

export async function createTestUser(plan: "free" | "light" | "pro" | "premium" = "premium"): Promise<TestUser> {
  const tag = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const email = `e2e+${tag}@mindreframe.local`;
  const password = "Test1234!" + tag;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `E2E ${tag}` },
  });
  if (error) throw new Error(`createTestUser: ${error.message}`);

  // PLAN_GATE_ENABLED=true 환경에서 모든 페이지 접근 가능하도록 기본 premium.
  // F41 onboarding 가드 + F75 닉네임 가드 우회를 위해 onboarding_completed/nickname_set=true 자동 설정.
  // 트리거가 public.users 자동 생성하므로 update만 필요. 생성 전이면 한 번 retry.
  for (let i = 0; i < 3; i++) {
    const { error: updateError, count } = await admin
      .from("users")
      .update(
        { plan, onboarding_completed: true, nickname_set: true },
        { count: "exact" },
      )
      .eq("id", data.user.id);
    if (!updateError && (count ?? 0) > 0) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  return { id: data.user.id, email, password };
}

// public.users → auth.users FK cascade가 없고 자식 테이블 대부분 ON DELETE CASCADE가
// 없어, auth만 지우면 public.users 행 + 자식 데이터가 고아로 남는다.
// 자식 행 → 어드민 참조 NULL → 본체 → auth 순으로 직접 정리.
export async function deleteTestUser(userId: string) {
  // ① 코치챗 (sender 먼저 → 세션이 메시지 cascade)
  await admin.from("coach_chat_messages").delete().eq("sender_id", userId);
  await admin.from("coach_chat_sessions").delete().eq("user_id", userId);

  // ② 채팅 분석 → 세션 (chat_messages·잔여 analyses cascade)
  await admin.from("chat_analyses").delete().eq("user_id", userId);
  await admin.from("chat_sessions").delete().eq("user_id", userId);

  // ③ 결제/구독 (payments → subscriptions)
  await admin.from("payments").update({ refunded_by: null }).eq("refunded_by", userId);
  await admin.from("payments").delete().eq("user_id", userId);
  await admin.from("subscriptions").delete().eq("user_id", userId);

  // ④ 단순 user_id 자식 테이블
  const userTables = [
    "notification_logs",
    "survey_responses",
    "emotion_scores",
    "routine_checks",
    "thought_records",
    "gratitude_entries",
    "study_progress",
    "exercise_logs",
    "meditation_logs",
    "user_badges",
    "ai_usage",
    "exercise_state",
    "coupon_redemptions",
  ];
  for (const table of userTables) {
    await admin.from(table).delete().eq("user_id", userId);
  }

  // ⑤ 어드민 테스트에서 수정한 콘텐츠 참조는 보존 위해 NULL 처리
  await admin.from("study_articles").update({ updated_by: null }).eq("updated_by", userId);
  await admin.from("notification_videos").update({ updated_by: null }).eq("updated_by", userId);
  await admin.from("notification_messages").update({ updated_by: null }).eq("updated_by", userId);
  await admin.from("site_settings").update({ updated_by: null }).eq("updated_by", userId);
  await admin.from("meditations").update({ updated_by: null }).eq("updated_by", userId);
  await admin.from("plans").update({ updated_by: null }).eq("updated_by", userId);
  await admin.from("coupons").update({ issued_by: null }).eq("issued_by", userId);

  // ⑥ 감사 로그 (admin_user_id NOT NULL → 행 삭제)
  await admin.from("admin_audit_logs").delete().eq("admin_user_id", userId);
  await admin.from("admin_audit_logs").delete().eq("target_user_id", userId);

  // ⑦ 본체
  await admin.from("users").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

/**
 * dev 전용 /api/auth/test-signin 엔드포인트로 로그인 → 쿠키 자동 세팅.
 */
export async function loginAs(page: Page, user: TestUser) {
  const response = await page.request.post("/api/auth/test-signin", {
    data: { email: user.email, password: user.password },
  });
  if (!response.ok()) {
    throw new Error(`loginAs failed: ${response.status()} ${await response.text()}`);
  }
}
