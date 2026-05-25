import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function createAdminUser() {
  const u = await createTestUser();
  await admin.from("users").update({ role: "admin" }).eq("id", u.id);
  return u;
}

/**
 * 활성 세션 + 첫 메시지를 직접 DB로 만들어둔다. (UI 흐름 거치지 않아 빠름)
 */
async function seedActiveSession(userId: string) {
  const { data: session, error } = await admin
    .from("coach_chat_sessions")
    .insert({ user_id: userId, status: "active" })
    .select("id")
    .single();
  if (error || !session) throw new Error(`seedActiveSession: ${error?.message}`);
  await admin.from("coach_chat_messages").insert({
    session_id: session.id,
    sender_id: userId,
    sender_role: "user",
    content: "테스트 메시지입니다",
  });
  return session.id as string;
}

test.describe("Sprint E-1 — coach 채팅 비-Realtime e2e (5건)", () => {
  test("1) 사용자 발화 옵티미스틱 — 전송 직후 화면에 즉시 표시", async ({
    page,
  }) => {
    const user = await createTestUser("pro");
    try {
      await loginAs(page, user);
      await page.goto("/coach");
      await page
        .getByRole("button", { name: /코치와 새 대화 시작/ })
        .click();
      const input = page.getByPlaceholder(/메시지를 입력/);
      await expect(input).toBeVisible();
      await input.fill("옵티미스틱 표시 테스트");
      // 전송 즉시 (서버 응답 전) 화면에 메시지가 나타나야 함
      await page.getByRole("button", { name: "전송" }).click();
      await expect(
        page.getByText("옵티미스틱 표시 테스트").first(),
      ).toBeVisible({ timeout: 1500 });
      // 새로고침 후에도 유지
      await page.reload();
      await expect(
        page.getByText("옵티미스틱 표시 테스트").first(),
      ).toBeVisible({ timeout: 5000 });
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("2) 사용자 측 세션 종료 버튼 부재 — DOM에 '대화 종료' 없음", async ({
    page,
  }) => {
    const user = await createTestUser("pro");
    try {
      await loginAs(page, user);
      await page.goto("/coach");
      await page
        .getByRole("button", { name: /코치와 새 대화 시작/ })
        .click();
      await expect(page.getByPlaceholder(/메시지를 입력/)).toBeVisible();
      // 사용자 화면에는 종료 버튼이 절대 없어야 함
      await expect(
        page.getByRole("button", { name: "대화 종료" }),
      ).toHaveCount(0);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("3) admin 접근 — admin이 /admin/coach/[id] 진입 가능 (회귀 방지)", async ({
    page,
  }) => {
    const adminUser = await createAdminUser();
    const target = await createTestUser("pro");
    let sessionId: string | null = null;
    try {
      sessionId = await seedActiveSession(target.id);
      await loginAs(page, adminUser);
      await page.goto(`/admin/coach/${sessionId}`);
      // 접근 권한 없음 페이지가 아니어야 + 답변 입력창이 보여야 함
      await expect(page.getByText("접근 권한 없음")).toHaveCount(0);
      await expect(page.getByPlaceholder(/답변을 입력/)).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText("테스트 메시지입니다")).toBeVisible();
    } finally {
      if (sessionId) {
        await admin.from("coach_chat_messages").delete().eq("session_id", sessionId);
        await admin.from("coach_chat_sessions").delete().eq("id", sessionId);
      }
      await deleteTestUser(target.id);
      await deleteTestUser(adminUser.id);
    }
  });

  test("4) 세션 횟수 ±1 조정 — admin 버튼 클릭 → users.coach_session_adjustment 반영", async ({
    page,
  }) => {
    const adminUser = await createAdminUser();
    const target = await createTestUser("pro");
    let sessionId: string | null = null;
    try {
      sessionId = await seedActiveSession(target.id);
      await loginAs(page, adminUser);
      await page.goto(`/admin/coach/${sessionId}`);
      // +1 버튼 클릭
      const plusBtn = page.getByRole("button", { name: "+1", exact: true });
      await expect(plusBtn).toBeVisible({ timeout: 5000 });
      await plusBtn.click();
      // 토스트 확인
      await expect(page.getByText(/횟수 조정 \+1/)).toBeVisible({
        timeout: 5000,
      });
      // DB 반영 확인
      const { data: u1 } = await admin
        .from("users")
        .select("coach_session_adjustment")
        .eq("id", target.id)
        .single();
      expect(u1?.coach_session_adjustment).toBe(1);

      // -1 버튼 클릭 → 0으로 복귀
      await page.getByRole("button", { name: "-1", exact: true }).click();
      await expect(page.getByText(/횟수 조정 -1/)).toBeVisible({ timeout: 5000 });
      const { data: u2 } = await admin
        .from("users")
        .select("coach_session_adjustment")
        .eq("id", target.id)
        .single();
      expect(u2?.coach_session_adjustment).toBe(0);
    } finally {
      if (sessionId) {
        await admin.from("coach_chat_messages").delete().eq("session_id", sessionId);
        await admin.from("coach_chat_sessions").delete().eq("id", sessionId);
      }
      await deleteTestUser(target.id);
      await deleteTestUser(adminUser.id);
    }
  });

  test("5) 코치 메모 — admin이 메모 작성 후 목록 노출 + 본인만 삭제 가능", async ({
    page,
  }) => {
    const adminUser = await createAdminUser();
    const target = await createTestUser("pro");
    let sessionId: string | null = null;
    try {
      sessionId = await seedActiveSession(target.id);
      await loginAs(page, adminUser);
      await page.goto(`/admin/coach/${sessionId}`);

      const tag = Date.now().toString(36);
      const noteText = `테스트 메모 ${tag}`;
      const ta = page.getByPlaceholder(/이 사용자에 대한 메모/);
      await expect(ta).toBeVisible({ timeout: 5000 });
      await ta.fill(noteText);
      await page.getByRole("button", { name: "메모 추가" }).click();
      await expect(page.getByText(noteText)).toBeVisible({ timeout: 5000 });

      // 본인 메모이므로 삭제 버튼 노출
      const noteRow = page
        .locator("li", { hasText: noteText })
        .first();
      await expect(noteRow.getByRole("button", { name: "삭제" })).toBeVisible();

      // DB에도 들어가 있어야 함 (admin select)
      const { data: notes } = await admin
        .from("coach_user_notes")
        .select("id, note, coach_id")
        .eq("user_id", target.id);
      expect(notes?.find((n) => n.note === noteText)).toBeTruthy();
    } finally {
      if (sessionId) {
        await admin.from("coach_user_notes").delete().eq("user_id", target.id);
        await admin.from("coach_chat_messages").delete().eq("session_id", sessionId);
        await admin.from("coach_chat_sessions").delete().eq("id", sessionId);
      }
      await deleteTestUser(target.id);
      await deleteTestUser(adminUser.id);
    }
  });
});
