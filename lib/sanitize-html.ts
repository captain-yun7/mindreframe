import "server-only";

/**
 * F89-4 — admin이 입력한 HTML(약관·방침·알고가기 본문) sanitize.
 *
 * 변경 사유: isomorphic-dompurify가 Vercel Node.js 환경에서 jsdom 모듈 초기화 시
 * /study/[slug] 500 에러. import 시점 throw라 try/catch 무용지물.
 *
 * 정책: 운영자(admin role)만 HTML 입력 가능한 신뢰 환경이라 sanitize 우회.
 * 차후 server-safe sanitize 라이브러리(예: sanitize-html npm)로 교체.
 *
 * 위험: admin role 탈취 시 XSS — 단 admin role 부여가 SQL 수동 작업이라 위험 작음.
 */
export function sanitizeContentHtml(input: string): string {
  // 최소한의 명시적 위협 제거 (script 태그) — DOMPurify 없이도 가장 흔한 XSS 차단
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}
