/**
 * 구글 OAuth 클라이언트 생성 자동화
 *
 * 1. Google Cloud Console 로그인
 * 2. 프로젝트 생성 (또는 기존 프로젝트 선택)
 * 3. OAuth 동의 화면 설정
 * 4. OAuth 2.0 클라이언트 생성
 * 5. Redirect URI 설정
 * 6. Client ID, Client Secret 추출
 */

import { chromium } from "playwright";
import { unlinkSync, writeFileSync } from "fs";

const SESSION_DIR = "scripts/.google-session";
const PROJECT_NAME = "fake-thoughts";
const APP_NAME = "가짜생각";
const REDIRECT_URIS = [
  "http://localhost:3000/api/auth/callback/google",
  "https://fake-thoughts.vercel.app/api/auth/callback/google",
];

const GOOGLE_EMAIL = "mindtheater00@gmail.com";
const GOOGLE_PW = "tjachtmd";

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

// ─── 1. Google Cloud Console 로그인 ───
console.log("[1/6] Google Cloud Console 로그인...");
await page.goto("https://console.cloud.google.com/");
await page.waitForTimeout(3000);

// 구글 로그인 필요 시
if (page.url().includes("accounts.google.com")) {
  console.log("  → 구글 로그인 페이지 감지...");

  const emailInput = page.locator("input[type='email']").first();
  if (await emailInput.isVisible()) {
    await emailInput.fill(GOOGLE_EMAIL);
    await page.locator("#identifierNext, button:has-text('다음')").first().click();
    await page.waitForTimeout(2000);
  }

  const pwInput = page.locator("input[type='password']").first();
  if (await pwInput.isVisible()) {
    await pwInput.fill(GOOGLE_PW);
    await page.locator("#passwordNext, button:has-text('다음')").first().click();
    await page.waitForTimeout(3000);
  }
}

// 로그인 대기
let attempts = 0;
while (attempts < 20) {
  if (page.url().includes("console.cloud.google.com") && !page.url().includes("accounts.google")) break;
  console.log("  → 로그인 대기 중... (2FA 등 수동 처리 필요할 수 있음)");
  await page.waitForTimeout(3000);
  attempts++;
}

console.log("  ✓ 로그인 완료:", page.url());

// ─── 2. API 및 서비스 → 사용자 인증 정보 ───
console.log("[2/6] OAuth 사용자 인증 정보 페이지 이동...");
await page.goto("https://console.cloud.google.com/apis/credentials");
await page.waitForTimeout(3000);

await page.screenshot({ path: "scripts/google-credentials.png", fullPage: true });

// ─── 3. 프로젝트 확인/생성 ───
console.log("[3/6] 프로젝트 확인...");
// 프로젝트 선택기가 있으면 확인
const projectSelector = page.locator("[aria-label*='project'], .cfc-purview-picker").first();
if (await projectSelector.isVisible()) {
  const currentProject = await projectSelector.textContent();
  console.log("  → 현재 프로젝트:", currentProject?.trim());
}

// ─── 4. OAuth 동의 화면 ───
console.log("[4/6] OAuth 동의 화면 확인...");
await page.goto("https://console.cloud.google.com/apis/credentials/consent");
await page.waitForTimeout(3000);

await page.screenshot({ path: "scripts/google-consent.png", fullPage: true });

// ─── 5. OAuth 클라이언트 생성 ───
console.log("[5/6] OAuth 2.0 클라이언트 생성...");
await page.goto("https://console.cloud.google.com/apis/credentials/oauthclient");
await page.waitForTimeout(3000);

// 애플리케이션 유형 선택 (웹 애플리케이션)
const appTypeSelect = page.locator("mat-select, select, [role='listbox']").first();
if (await appTypeSelect.isVisible()) {
  await appTypeSelect.click();
  await page.waitForTimeout(1000);
  const webOption = page.locator("mat-option:has-text('웹 애플리케이션'), option:has-text('웹')").first();
  if (await webOption.isVisible()) {
    await webOption.click();
    await page.waitForTimeout(1000);
  }
}

// 이름 입력
const nameInput = page.locator("input[aria-label*='이름'], input[formcontrolname='name']").first();
if (await nameInput.isVisible()) {
  await nameInput.fill(APP_NAME);
}

// Redirect URI 추가
for (const uri of REDIRECT_URIS) {
  const addUriBtn = page.locator("button:has-text('URI 추가'), button:has-text('ADD URI')").last();
  if (await addUriBtn.isVisible()) {
    await addUriBtn.click();
    await page.waitForTimeout(500);
  }
  const uriInput = page.locator("input[placeholder*='URI'], input[aria-label*='URI']").last();
  if (await uriInput.isVisible()) {
    await uriInput.fill(uri);
  }
}

await page.screenshot({ path: "scripts/google-oauth-form.png", fullPage: true });

// 만들기 버튼
const createBtn = page.locator("button:has-text('만들기'), button:has-text('CREATE')").first();
if (await createBtn.isVisible()) {
  await createBtn.click();
  await page.waitForTimeout(3000);
}

// ─── 6. 결과 추출 ───
console.log("[6/6] Client ID/Secret 추출...");
await page.screenshot({ path: "scripts/google-oauth-result.png", fullPage: true });

const bodyText = await page.textContent("body");

const clientIdMatch = bodyText.match(/(\d+-[a-z0-9]+\.apps\.googleusercontent\.com)/);
const clientSecretMatch = bodyText.match(/GOCSPX-[a-zA-Z0-9_-]+/);

const result = {
  service: "google",
  appName: APP_NAME,
  clientId: clientIdMatch ? clientIdMatch[1] : "스크린샷 확인 필요 (scripts/google-oauth-result.png)",
  clientSecret: clientSecretMatch ? clientSecretMatch[0] : "스크린샷 확인 필요",
  redirectUris: REDIRECT_URIS,
  screenshots: [
    "scripts/google-credentials.png",
    "scripts/google-consent.png",
    "scripts/google-oauth-form.png",
    "scripts/google-oauth-result.png",
  ],
};

writeFileSync("scripts/google-oauth-result.json", JSON.stringify(result, null, 2));
console.log("\n✅ 구글 OAuth 설정 완료! 결과: scripts/google-oauth-result.json");
console.log("\n⏳ 브라우저를 열어두었습니다. 수동 확인 후 닫아주세요.");

await page.waitForTimeout(60000);
await browser.close();
