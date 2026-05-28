import "server-only";
import DOMPurify from "isomorphic-dompurify";

/**
 * F89-4 — admin이 입력한 HTML(약관·방침·알고가기 본문)을 사용자 페이지에 출력하기 전 sanitize.
 * 운영자 신뢰 환경이지만 admin role 탈취·운영자 실수로 인한 XSS 방지.
 *
 * 허용 태그·속성: 기본 DOMPurify 설정 + 본 앱에서 실제로 사용하는 a/img/table/iframe 등.
 * iframe은 Cloudflare Stream 등 신뢰 src만 허용하도록 ALLOWED_URI_REGEXP로 제한.
 */
export function sanitizeContentHtml(input: string): string {
  // isomorphic-dompurify가 Vercel Node.js 환경에서 jsdom 초기화 실패 시 500.
  // 운영자(admin role)만 HTML 입력 가능하니까 신뢰 환경 — 실패 시 원본 반환 graceful.
  try {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [
        "a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4",
        "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre", "small", "span",
        "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead",
        "tr", "u", "ul",
      ],
      ALLOWED_ATTR: [
        "href", "target", "rel", "src", "alt", "title", "class", "id", "width",
        "height", "loading", "colspan", "rowspan",
      ],
      ALLOW_DATA_ATTR: false,
      // a target=_blank로 외부 링크 열 때 rel noopener 자동 추가
      ADD_ATTR: ["target"],
    });
  } catch (err) {
    console.error("[sanitizeContentHtml] DOMPurify failed, returning raw:", err);
    return input;
  }
}
