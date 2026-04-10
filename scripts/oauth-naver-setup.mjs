/**
 * 네이버 OAuth 앱 등록 자동화
 *
 * 1. Naver Developers 로그인
 * 2. 새 앱 등록
 * 3. 네이버 로그인 API 추가
 * 4. Redirect URI 설정
 * 5. Client ID, Client Secret 추출
 */

import { chromium } from "playwright";
import { unlinkSync, writeFileSync } from "fs";

const SESSION_DIR = "scripts/.naver-session";
const APP_NAME = "가짜생각";
const REDIRECT_URIS = [
  "http://localhost:3000/api/auth/callback/naver",
  "https://fake-thoughts.vercel.app/api/auth/callback/naver",
];

const NAVER_ID = "eanya";
const NAVER_PW = "taThata00!";

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

// ─── 1. Naver Developers 로그인 ───
console.log("[1/5] Naver Developers 로그인...");
await page.goto("https://developers.naver.com/main/");
await page.waitForTimeout(2000);

const loginLink = page.locator("a:has-text('로그인'), a[href*='login']").first();
if (await loginLink.isVisible()) {
  await loginLink.click();
  await page.waitForTimeout(2000);
}

// 네이버 로그인 폼
if (page.url().includes("nid.naver.com") || page.url().includes("login")) {
  console.log("  → 네이버 로그인 페이지 감지...");

  const idInput = page.locator("#id, input[name='id']").first();
  const pwInput = page.locator("#pw, input[name='pw']").first();

  if (await idInput.isVisible()) {
    // 네이버는 직접 fill이 안 되는 경우가 있어 evaluate 사용
    await idInput.click();
    await page.evaluate((id) => {
      document.querySelector("#id").value = id;
    }, NAVER_ID);
    await page.waitForTimeout(500);

    await pwInput.click();
    await page.evaluate((pw) => {
      document.querySelector("#pw").value = pw;
    }, NAVER_PW);
    await page.waitForTimeout(500);

    await page.locator("button[type='submit'], #log\\.login, button:has-text('로그인')").first().click();
    await page.waitForTimeout(3000);
  }
}

// 로그인 대기
let attempts = 0;
while (attempts < 20) {
  const url = page.url();
  if (url.includes("developers.naver.com") && !url.includes("login")) break;
  console.log("  → 로그인 대기 중... (캡차/2FA 시 수동 처리)");
  await page.waitForTimeout(3000);
  attempts++;
}

console.log("  ✓ 로그인 완료:", page.url());

// ─── 2. 내 애플리케이션 목록 ───
console.log("[2/5] 내 애플리케이션 확인...");
await page.goto("https://developers.naver.com/apps/#/list");
await page.waitForTimeout(2000);

// 기존 앱 확인
const existingApp = page.locator(`a:has-text("${APP_NAME}")`).first();
if (await existingApp.isVisible()) {
  console.log("  → 기존 앱 발견, 클릭...");
  await existingApp.click();
  await page.waitForTimeout(2000);
} else {
  // ─── 3. 새 앱 등록 ───
  console.log("[3/5] 새 앱 등록...");
  await page.goto("https://developers.naver.com/apps/#/register");
  await page.waitForTimeout(2000);

  // 앱 이름
  const nameInput = page.locator("input[name='name'], #name").first();
  if (await nameInput.isVisible()) {
    await nameInput.fill(APP_NAME);
  }

  // 사용 API: 네이버 로그인 체크
  const loginApiCheck = page.locator("input[value='nid_login'], label:has-text('네이버 로그인')").first();
  if (await loginApiCheck.isVisible()) {
    await loginApiCheck.click();
    await page.waitForTimeout(1000);
  }

  // 제공 정보: 이름, 이메일, 프로필 사진
  const checkboxes = ["name", "email", "profile_image"];
  for (const name of checkboxes) {
    const cb = page.locator(`input[value='${name}'], input[name='${name}']`).first();
    if (await cb.isVisible() && !(await cb.isChecked())) {
      await cb.click();
    }
  }

  // 환경: PC 웹
  const envSelect = page.locator("select[name='envType'], #envType").first();
  if (await envSelect.isVisible()) {
    await envSelect.selectOption("web");
    await page.waitForTimeout(1000);
  }

  // 서비스 URL
  const serviceUrlInput = page.locator("input[name='webUrl'], input[placeholder*='서비스 URL']").first();
  if (await serviceUrlInput.isVisible()) {
    await serviceUrlInput.fill("https://fake-thoughts.vercel.app");
  }

  // Callback URL
  const callbackInput = page.locator("input[name='callbackUrl'], input[placeholder*='Callback']").first();
  if (await callbackInput.isVisible()) {
    await callbackInput.fill(REDIRECT_URIS.join("\n"));
  }

  await page.screenshot({ path: "scripts/naver-register-form.png", fullPage: true });

  // 등록
  const registerBtn = page.locator("button:has-text('등록하기'), button[type='submit']").first();
  if (await registerBtn.isVisible()) {
    await registerBtn.click();
    await page.waitForTimeout(3000);
  }
}

// ─── 4. 앱 정보에서 키 추출 ───
console.log("[4/5] Client ID/Secret 추출...");
await page.screenshot({ path: "scripts/naver-app-info.png", fullPage: true });

const bodyText = await page.textContent("body");

const clientIdMatch = bodyText.match(/Client ID[\s\S]*?([a-zA-Z0-9_]{20,})/);
const clientSecretMatch = bodyText.match(/Client Secret[\s\S]*?([a-zA-Z0-9_]{10,})/);

const result = {
  service: "naver",
  appName: APP_NAME,
  clientId: clientIdMatch ? clientIdMatch[1] : "스크린샷 확인 필요 (scripts/naver-app-info.png)",
  clientSecret: clientSecretMatch ? clientSecretMatch[1] : "스크린샷 확인 필요",
  redirectUris: REDIRECT_URIS,
  screenshots: [
    "scripts/naver-register-form.png",
    "scripts/naver-app-info.png",
  ],
};

writeFileSync("scripts/naver-oauth-result.json", JSON.stringify(result, null, 2));
console.log("\n✅ 네이버 OAuth 설정 완료! 결과: scripts/naver-oauth-result.json");
console.log("\n⏳ 브라우저를 열어두었습니다. 수동 확인 후 닫아주세요.");

// ─── 5. 완료 ───
await page.waitForTimeout(60000);
await browser.close();
