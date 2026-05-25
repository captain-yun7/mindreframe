/**
 * Sprint B 시각 검증 스크립트.
 *
 * 사용:
 *   tsx scripts/visual-check.ts --reference                          # 토스 참조 사이트 캡쳐 (1회)
 *   tsx scripts/visual-check.ts --phase 1 --routes /,/login          # 우리 페이지 캡쳐
 *   tsx scripts/visual-check.ts --phase 3 --routes / --viewport 1280
 *
 * 동작:
 *   1. chromium 실행 (headless)
 *   2. --reference : https://www.tosspayments.com/ 캡쳐 → reference-toss-{vp}.png
 *   3. 우리 페이지: --routes 콤마 구분, --phase 숫자, --viewport 콤마 구분
 *      networkidle 대기 + 600ms 추가 대기 (fade-in 완료 위함)
 *   4. 저장: _docs/audit/screenshots/<phase>-<route-slug>-<vp>.png
 *
 * 환경:
 *   - dev server는 별도 터미널에서 띄우거나, --port 옵션으로 변경 가능 (기본 3000)
 *   - DEV_BASE_URL 환경변수로도 override 가능
 *
 * 주의:
 *   - 인증 필요 라우트(/dashboard 등)는 별도 로그인 helper 필요 (Phase 2 이후 추가)
 *   - Phase 1에서는 public 라우트만 캡쳐 (/, /login, /signup, /pricing 등)
 */
import { chromium, type Browser } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

interface Viewport {
  name: string;
  width: number;
  height: number;
}

const VIEWPORTS: Record<string, Viewport> = {
  mobile: { name: "mobile", width: 375, height: 667 },
  tablet: { name: "tablet", width: 768, height: 1024 },
  desktop: { name: "desktop", width: 1280, height: 800 },
};

const SCREENSHOT_DIR = resolve(
  process.cwd(),
  "_docs/audit/screenshots",
);

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

function routeSlug(route: string): string {
  if (route === "/" || route === "") return "home";
  return route.replace(/^\//, "").replace(/\//g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
}

async function captureToss(browser: Browser) {
  console.log("[reference] 토스 참조 캡쳐 시작 https://www.tosspayments.com/");
  const url = "https://www.tosspayments.com/";

  for (const vp of [VIEWPORTS.desktop, VIEWPORTS.tablet, VIEWPORTS.mobile]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForTimeout(1200);
      const out = join(SCREENSHOT_DIR, `reference-toss-${vp.width}.png`);
      await page.screenshot({ path: out, fullPage: true });
      console.log(`[reference] saved ${out}`);
    } catch (err) {
      console.error(`[reference] ${vp.name} 실패:`, (err as Error).message);
    } finally {
      await ctx.close();
    }
  }
}

async function captureRoute(
  browser: Browser,
  baseUrl: string,
  route: string,
  vp: Viewport,
  phase: string,
) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  try {
    const url = `${baseUrl}${route}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(600); // fade-in 완료 대기
    const out = join(
      SCREENSHOT_DIR,
      `phase${phase}-${routeSlug(route)}-${vp.width}.png`,
    );
    await page.screenshot({ path: out, fullPage: true });
    console.log(`[phase${phase}] ${route} @ ${vp.width} -> ${out}`);
  } catch (err) {
    console.error(`[phase${phase}] ${route} @ ${vp.width} 실패:`, (err as Error).message);
  } finally {
    await ctx.close();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    if (args.reference) {
      await captureToss(browser);
      return;
    }

    const phase = String(args.phase ?? "1");
    const port = String(args.port ?? "3000");
    const baseUrl = String(args["base-url"] ?? process.env.DEV_BASE_URL ?? `http://localhost:${port}`);
    const routesArg = String(args.routes ?? "/");
    const routes = routesArg.split(",").map((r) => r.trim()).filter(Boolean);
    const viewportArg = String(args.viewport ?? "375,768,1280");
    const viewports: Viewport[] = viewportArg
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => {
        if (v === "mobile") return VIEWPORTS.mobile;
        if (v === "tablet") return VIEWPORTS.tablet;
        if (v === "desktop") return VIEWPORTS.desktop;
        const w = parseInt(v, 10);
        if (w === 375) return VIEWPORTS.mobile;
        if (w === 768) return VIEWPORTS.tablet;
        if (w === 1280) return VIEWPORTS.desktop;
        return { name: `w${w}`, width: w, height: 800 };
      });

    console.log(`[phase${phase}] baseUrl=${baseUrl} routes=${routes.join(",")} viewports=${viewports.map((v) => v.width).join(",")}`);

    for (const route of routes) {
      for (const vp of viewports) {
        await captureRoute(browser, baseUrl, route, vp, phase);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
