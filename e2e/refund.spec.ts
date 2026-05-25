import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function createAdminUser() {
  const user = await createTestUser();
  await admin.from("users").update({ role: "admin" }).eq("id", user.id);
  return user;
}

/**
 * paid 상태 결제 1건을 seed. payment_key=null로 두면 server action이 토스 호출 skip.
 * payments 테이블 refunded_at 컬럼 부재(마이그 미적용)이면 skip 사유 반환.
 */
async function seedPaidPayment(opts: {
  userId: string;
  amount: number;
  plan: string;
  paidAt: string;
}): Promise<{ ok: boolean; id?: string; reason?: string }> {
  const { data, error } = await admin
    .from("payments")
    .insert({
      user_id: opts.userId,
      amount: opts.amount,
      plan: opts.plan,
      status: "paid",
      payment_key: null,
      paid_at: opts.paidAt,
    })
    .select("id")
    .single();
  if (error) {
    return { ok: false, reason: error.message };
  }
  return { ok: true, id: (data as { id: string }).id };
}

async function deletePayment(id: string) {
  await admin.from("payments").delete().eq("id", id).then(() => {});
}

test.describe("F91 — 환불", () => {
  test("admin이 paid 결제 환불 → status='refunded' + plan='free'", async ({
    page,
  }) => {
    const adminUser = await createAdminUser();
    const target = await createTestUser("pro");
    const paidAt = new Date().toISOString();
    const seeded = await seedPaidPayment({
      userId: target.id,
      amount: 394_000,
      plan: "pro",
      paidAt,
    });
    test.skip(!seeded.ok, seeded.reason ?? "");

    try {
      await loginAs(page, adminUser);
      await page.goto("/admin/payments?status=paid");

      // 환불 모달 열기
      await page
        .getByRole("button", { name: "환불", exact: true })
        .first()
        .click();
      await page.getByPlaceholder("예: 사용자 요청").fill("e2e 테스트 환불");

      // confirm() 자동 수락
      page.once("dialog", (d) => {
        d.accept().catch(() => {});
      });
      await page.getByRole("button", { name: "환불 확정" }).click();

      // 토스트(NOT_CONFIGURED 또는 정상 완료)
      await expect(
        page.getByText(/환불 완료|수동 환불이 필요/),
      ).toBeVisible({ timeout: 8000 });

      // DB 검증
      const { data: payRow } = await admin
        .from("payments")
        .select("status, refunded_at")
        .eq("id", seeded.id!)
        .single();
      expect((payRow as { status: string }).status).toBe("refunded");
      expect(
        (payRow as { refunded_at: string | null }).refunded_at,
      ).not.toBeNull();

      const { data: userRow } = await admin
        .from("users")
        .select("plan, plan_expires_at")
        .eq("id", target.id)
        .single();
      expect((userRow as { plan: string }).plan).toBe("free");
      expect(
        (userRow as { plan_expires_at: string | null }).plan_expires_at,
      ).toBeNull();
    } finally {
      if (seeded.id) await deletePayment(seeded.id);
      await deleteTestUser(target.id);
      await deleteTestUser(adminUser.id);
    }
  });

  test("7일 초과 결제 환불 시 경고 표시", async ({ page }) => {
    const adminUser = await createAdminUser();
    const target = await createTestUser("pro");
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();
    const seeded = await seedPaidPayment({
      userId: target.id,
      amount: 394_000,
      plan: "pro",
      paidAt: eightDaysAgo,
    });
    test.skip(!seeded.ok, seeded.reason ?? "");

    try {
      await loginAs(page, adminUser);
      await page.goto("/admin/payments?status=paid");

      await page
        .getByRole("button", { name: "환불", exact: true })
        .first()
        .click();

      // 모달 내 경고 배너
      await expect(
        page.getByText("결제 후 7일 초과 — 수동 검토 권장"),
      ).toBeVisible({ timeout: 3000 });
    } finally {
      if (seeded.id) await deletePayment(seeded.id);
      await deleteTestUser(target.id);
      await deleteTestUser(adminUser.id);
    }
  });
});
