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
  // 트리거가 public.users 자동 생성하므로 update만 필요. 생성 전이면 한 번 retry.
  for (let i = 0; i < 3; i++) {
    const { error: updateError, count } = await admin
      .from("users")
      .update({ plan }, { count: "exact" })
      .eq("id", data.user.id);
    if (!updateError && (count ?? 0) > 0) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  return { id: data.user.id, email, password };
}

export async function deleteTestUser(userId: string) {
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
