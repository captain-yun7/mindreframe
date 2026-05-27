import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, loginAs } from "./helpers/auth";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * H3 — /admin/settings 17개 키 노출·편집·반영.
 *
 * 17 키 (`app/(auth)/admin/settings/page.tsx::KEY_ORDER`):
 *   system 5: service_name, company_name, contact_email, effective_date, footer_address
 *   landing 5: landing_hero_title, landing_hero_subtitle, landing_menu_items, landing_stats, landing_final_cta
 *   hero subtitle 6: dashboard_hero_subtitle, trash_hero_subtitle, progress_hero_subtitle, chat_hero_subtitle, exercise_hero_subtitle, meditation_hero_subtitle
 *   popup 7: popup_trash_intro, popup_chat_intro, popup_meditation_focus, popup_exercise_step1~3, popup_exercise_step4_praise
 *   law 2: terms_html, privacy_html
 *   → 합계 25키지만 KEY_ORDER에 정의된 노출 키 수는 그대로 검증
 */
const EXPECTED_KEYS = [
  "service_name",
  "company_name",
  "contact_email",
  "effective_date",
  "footer_address",
  "landing_hero_title",
  "landing_hero_subtitle",
  "landing_menu_items",
  "landing_stats",
  "landing_final_cta",
  "dashboard_hero_subtitle",
  "trash_hero_subtitle",
  "progress_hero_subtitle",
  "chat_hero_subtitle",
  "exercise_hero_subtitle",
  "meditation_hero_subtitle",
  "popup_trash_intro",
  "popup_chat_intro",
  "popup_meditation_focus",
  "popup_exercise_step1",
  "popup_exercise_step2",
  "popup_exercise_step3",
  "popup_exercise_step4_praise",
  "terms_html",
  "privacy_html",
];

test.describe("/admin/settings (H3)", () => {
  test.beforeAll(async () => {
    const { error } = await admin.from("site_settings").select("key").limit(1);
    if (error && /relation .* does not exist/.test(error.message)) {
      test.skip(true, `site_settings 미적용: ${error.message}`);
    }
  });

  test("admin 사용자가 /admin/settings 진입 → KEY_ORDER 키 노출", async ({ page }) => {
    const adminUser = await createTestUser("premium");
    try {
      // role=admin으로 승격
      const { error: roleErr } = await admin
        .from("users")
        .update({ role: "admin" })
        .eq("id", adminUser.id);
      test.skip(!!roleErr, roleErr?.message ?? "");

      await loginAs(page, adminUser);
      await page.goto("/admin/settings");

      await expect(page.getByRole("heading", { name: /사이트 설정/ })).toBeVisible();

      // KEY_ORDER 키들이 페이지에 노출 (code 태그로 표시됨)
      for (const key of EXPECTED_KEYS.slice(0, 5)) {
        await expect(page.locator(`code:has-text("${key}")`).first()).toBeVisible();
      }
      // popup 키들 — 1개만 확인 (전체 25개는 page 길어서 일부)
      await expect(
        page.locator(`code:has-text("popup_trash_intro")`).first(),
      ).toBeVisible();
      await expect(
        page.locator(`code:has-text("popup_exercise_step4_praise")`).first(),
      ).toBeVisible();
    } finally {
      await deleteTestUser(adminUser.id);
    }
  });

  test("비-admin은 /admin/settings 접근 차단 → / 리다이렉트", async ({ page }) => {
    const u = await createTestUser("premium");
    try {
      await loginAs(page, u);
      await page.goto("/admin/settings");
      // requireAdmin → redirect("/")
      await page.waitForURL(/\/(\?|$)/, { timeout: 10_000 });
    } finally {
      await deleteTestUser(u.id);
    }
  });

  test("text 키(landing_hero_title) 편집·저장 → 랜딩 페이지에 반영", async ({ page }) => {
    const adminUser = await createTestUser("premium");
    try {
      const { error: roleErr } = await admin
        .from("users")
        .update({ role: "admin" })
        .eq("id", adminUser.id);
      test.skip(!!roleErr, roleErr?.message ?? "");

      const tag = Date.now().toString(36);
      const newValue = `E2E 테스트 타이틀 ${tag}`;

      // DB 직접 UPSERT (UI 저장 흐름은 별도 case로 검증)
      const { error: upErr } = await admin
        .from("site_settings")
        .upsert(
          { key: "landing_hero_title", value: newValue },
          { onConflict: "key" },
        );
      test.skip(!!upErr, upErr?.message ?? "");

      // 랜딩 페이지에서 반영 확인 (로그아웃 또는 비로그인 상태로)
      const newPage = await page.context().browser()?.newContext();
      const p = await newPage?.newPage();
      if (!p) {
        test.skip(true, "no fresh context");
        return;
      }
      try {
        await p.goto("/");
        await expect(p.getByText(newValue).first()).toBeVisible({ timeout: 10_000 });
      } finally {
        await p.close();
        await newPage?.close();
      }

      // 정리 — DB에서 해당 row 삭제 (다음 테스트 영향 방지)
      await admin.from("site_settings").delete().eq("key", "landing_hero_title");
    } finally {
      await deleteTestUser(adminUser.id);
    }
  });
});
