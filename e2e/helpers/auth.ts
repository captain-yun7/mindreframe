import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export type TestUser = { id: string; email: string; password: string };

export async function createTestUser(): Promise<TestUser> {
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
