/**
 * 카카오 OAuth 앱 등록 자동화
 *
 * 첫 실행 시 2차 인증은 수동으로 해야 합니다.
 * → 브라우저가 열리면 직접 로그인 → 이후 세션 저장 → 다음부터 자동
 */

import { chromium } from "playwright";
import { unlinkSync, writeFileSync } from "fs";

const SESSION_DIR = "scripts/.kakao-session";
const APP_NAME = "가짜생각";
const REDIRECT_URIS = [
  "http://localhost:3000/api/auth/callback/kakao",
  "https://fake-thoughts.vercel.app/api/auth/callback/kakao",
];

try { unlinkSync(`${SESSION_DIR}/SingletonLock`); } catch {}

const browser = await chromium.launchPersistentContext(SESSION_DIR, {
  headless: false,
  viewport: { width: 1400, height: 900 },
});

const page = browser.pages()[0] || await browser.newPage();

page.on("dialog", async (dialog) => {
  console.log(`다이얼로그: ${dialog.message()}`);
  await dialog.accept();
});

// ─── 1. 로그인 (수동 대기) ───
console.log("[1/5] Kakao Developers 이동...");
await page.goto("https://developers.kakao.com/console/app");
await page.waitForTimeout(2000);

// 로그인이 필요하면 대기
if (!page.url().includes("developers.kakao.com/console")) {
  console.log("");
  console.log("  ⚠️  브라우저에서 카카오 로그인을 완료해주세요!");
  console.log("  ⚠️  2차 인증이 있으면 직접 처리해주세요.");
  console.log("  ⚠️  로그인 완료 후 자동으로 진행됩니다. (최대 3분 대기)");
  console.log("");

  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(3000);
    const url = page.url();
    if (url.includes("developers.kakao.com/console")) break;
    if (i % 10 === 9) console.log("  ... 아직 대기 중");
  }
}

if (!page.url().includes("developers.kakao.com/console")) {
  console.log("❌ 로그인 시간 초과. 다시 실행해주세요. (세션은 저장됨)");
  await browser.close();
  process.exit(1);
}

console.log("  ✓ 로그인 완료!");

// ─── 2. 앱 확인/생성 ───
console.log("[2/5] 내 애플리케이션 확인...");
await page.waitForTimeout(1500);
await page.screenshot({ path: "scripts/kakao-01-app-list.png", fullPage: true });

const existingApp = page.locator(`text="${APP_NAME}"`).first();
if (await existingApp.isVisible().catch(() => false)) {
  console.log("  → 기존 앱 발견, 클릭...");
  await existingApp.click();
  await page.waitForTimeout(2000);
} else {
  console.log("  → 앱 없음. 새로 생성 필요.");
  console.log("  → '애플리케이션 추가하기' 버튼을 눌러주세요.");

  // 추가 버튼 시도
  const addBtn = page.locator("a:has-text('애플리케이션 추가하기'), button:has-text('추가')").first();
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
    await page.waitForTimeout(2000);

    // 폼 입력 시도
    const inputs = await page.locator("input[type='text']").all();
    for (const input of inputs) {
      const placeholder = await input.getAttribute("placeholder").catch(() => "");
      if (placeholder?.includes("이름") || placeholder?.includes("앱")) {
        await input.fill(APP_NAME);
        console.log("  → 앱 이름 입력 완료");
      }
      if (placeholder?.includes("사업자") || placeholder?.includes("회사")) {
        await input.fill(APP_NAME);
      }
    }

    await page.screenshot({ path: "scripts/kakao-02-create-form.png", fullPage: true });

    const saveBtn = page.locator("button:has-text('저장'), button:has-text('만들기'), button:has-text('확인')").first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(3000);
    }
  }
}

// ─── 3. 앱 키 스크린샷 ───
console.log("[3/5] 앱 키 캡처...");
await page.screenshot({ path: "scripts/kakao-03-app-keys.png", fullPage: true });

// 폼 필드 추출 (디버그용)
const fields = await page.evaluate(() => {
  const result = {};
  document.querySelectorAll("[class*='key'], [class*='Key'], td, .desc_item").forEach(el => {
    const text = el.textContent?.trim();
    if (text && text.length > 10 && text.length < 100) {
      result[el.className || el.tagName] = text;
    }
  });
  return result;
});
writeFileSync("scripts/kakao-page-fields.json", JSON.stringify(fields, null, 2));

// ─── 4. 카카오 로그인 설정 ───
console.log("[4/5] 카카오 로그인 설정 이동...");

// 좌측 메뉴에서 "카카오 로그인" 클릭
const kakaoLoginMenu = page.locator("a:has-text('카카오 로그인')").first();
if (await kakaoLoginMenu.isVisible().catch(() => false)) {
  await kakaoLoginMenu.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scripts/kakao-04-login-settings.png", fullPage: true });
  console.log("  → 카카오 로그인 설정 페이지 캡처 완료");
}

// ─── 5. 보안 탭 ───
console.log("[5/5] 보안 탭 확인...");
const secMenu = page.locator("a:has-text('보안')").first();
if (await secMenu.isVisible().catch(() => false)) {
  await secMenu.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scripts/kakao-05-security.png", fullPage: true });
  console.log("  → 보안 탭 캡처 완료");
}

// 결과 저장
const result = {
  service: "kakao",
  appName: APP_NAME,
  redirectUris: REDIRECT_URIS,
  screenshots: [
    "scripts/kakao-01-app-list.png",
    "scripts/kakao-02-create-form.png",
    "scripts/kakao-03-app-keys.png",
    "scripts/kakao-04-login-settings.png",
    "scripts/kakao-05-security.png",
  ],
  note: "스크린샷에서 REST API Key, Client Secret 확인 필요. 카카오 로그인 활성화 + Redirect URI 수동 설정 필요할 수 있음.",
  manualSteps: [
    "1. 카카오 로그인 '활성화' 토글 ON",
    `2. Redirect URI 추가: ${REDIRECT_URIS.join(", ")}`,
    "3. 보안 탭에서 Client Secret 생성",
    "4. 동의항목에서 닉네임, 이메일 필수 동의 설정",
  ],
};

writeFileSync("scripts/kakao-oauth-result.json", JSON.stringify(result, null, 2));

console.log("");
console.log("✅ 카카오 OAuth 캡처 완료!");
console.log("📸 스크린샷 5장 저장됨 (scripts/kakao-*.png)");
console.log("");
console.log("📋 수동 확인 필요 사항:");
result.manualSteps.forEach(s => console.log("  " + s));
console.log("");
console.log("⏳ 60초 후 브라우저가 닫힙니다. 수동 설정이 필요하면 지금 해주세요.");

await page.waitForTimeout(60000);
await browser.close();
