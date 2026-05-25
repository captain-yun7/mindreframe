import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * 동일 테스트 안에서 쿠폰을 생성하고 정리한다.
 * coupons 테이블 부재(마이그 미적용)이면 테스트를 skip.
 */
async function createCoupon(opts: {
  code: string;
  plan: "light" | "pro" | "premium";
  durationDays: number;
  maxUses?: number | null;
  isActive?: boolean;
  validUntil?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const { error } = await admin.from("coupons").insert({
    code: opts.code,
    plan: opts.plan,
    duration_days: opts.durationDays,
    max_uses: opts.maxUses ?? null,
    is_active: opts.isActive ?? true,
    valid_until: opts.validUntil ?? null,
    used_count: 0,
  });
  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      return { ok: false, reason: "coupons 테이블 부재 (마이그 미적용)" };
    }
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

async function deleteCoupon(code: string) {
  await admin.from("coupon_redemptions").delete().eq("coupon_code", code);
  await admin.from("coupons").delete().eq("code", code).then(() => {});
}

function makeCode(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();
}

test.describe("F88 — 쿠폰 redeem", () => {
  test("free 사용자 → 유효한 쿠폰 redeem → plan=pro + expires 채워짐", async ({
    page,
  }) => {
    const code = makeCode("PROMO");
    const created = await createCoupon({
      code,
      plan: "pro",
      durationDays: 30,
      maxUses: 10,
    });
    test.skip(!created.ok, created.reason ?? "");

    const user = await createTestUser("free");
    try {
      await loginAs(page, user);
      await page.goto("/pricing");

      await page.getByPlaceholder("WELCOME7").fill(code);
      await page.getByRole("button", { name: "쿠폰 적용" }).click();

      await expect(page.getByText("쿠폰이 적용됐어요!")).toBeVisible({
        timeout: 5000,
      });

      // DB 검증
      const { data } = await admin
        .from("users")
        .select("plan, plan_expires_at")
        .eq("id", user.id)
        .single();
      expect((data as { plan: string }).plan).toBe("pro");
      expect((data as { plan_expires_at: string | null }).plan_expires_at).not.toBeNull();
    } finally {
      await deleteCoupon(code);
      await deleteTestUser(user.id);
    }
  });

  test("같은 쿠폰 재사용 시 거부", async ({ page }) => {
    const code = makeCode("ONCE");
    const created = await createCoupon({
      code,
      plan: "light",
      durationDays: 7,
      maxUses: 100,
    });
    test.skip(!created.ok, created.reason ?? "");

    const user = await createTestUser("free");
    try {
      await loginAs(page, user);
      await page.goto("/pricing");

      // 1차 적용 — 성공
      await page.getByPlaceholder("WELCOME7").fill(code);
      await page.getByRole("button", { name: "쿠폰 적용" }).click();
      await expect(page.getByText("쿠폰이 적용됐어요!")).toBeVisible({
        timeout: 5000,
      });

      // 2차 — 동일 사용자 동일 쿠폰 거부
      await page.getByPlaceholder("WELCOME7").fill(code);
      await page.getByRole("button", { name: "쿠폰 적용" }).click();
      await expect(page.getByText("이미 사용한 쿠폰이에요")).toBeVisible({
        timeout: 5000,
      });
    } finally {
      await deleteCoupon(code);
      await deleteTestUser(user.id);
    }
  });

  test("만료된 쿠폰 거부", async ({ page }) => {
    const code = makeCode("EXPIRED");
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const created = await createCoupon({
      code,
      plan: "pro",
      durationDays: 30,
      maxUses: 10,
      validUntil: yesterday,
    });
    test.skip(!created.ok, created.reason ?? "");

    const user = await createTestUser("free");
    try {
      await loginAs(page, user);
      await page.goto("/pricing");

      await page.getByPlaceholder("WELCOME7").fill(code);
      await page.getByRole("button", { name: "쿠폰 적용" }).click();

      await expect(page.getByText("사용 기간이 지난 쿠폰이에요")).toBeVisible({
        timeout: 5000,
      });

      // plan 변경되지 않음
      const { data } = await admin
        .from("users")
        .select("plan")
        .eq("id", user.id)
        .single();
      expect((data as { plan: string }).plan).toBe("free");
    } finally {
      await deleteCoupon(code);
      await deleteTestUser(user.id);
    }
  });
});
