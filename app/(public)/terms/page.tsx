import type { Metadata } from "next";
import {
  FALLBACK_TERMS_HTML,
  applyPlaceholders,
  getSiteSettings,
} from "@/lib/site-settings";
import { sanitizeContentHtml } from "@/lib/sanitize-html";

export const metadata: Metadata = {
  title: "이용약관",
};

// admin 변경 시 revalidatePath로 즉시 갱신되므로 5분 캐시
export const revalidate = 300;

export default async function TermsPage() {
  const settings = await getSiteSettings();
  const rawBody = settings.terms_html || FALLBACK_TERMS_HTML;
  const body = sanitizeContentHtml(applyPlaceholders(rawBody, settings));
  const effectiveDate = settings.effective_date || "2026-05-01";

  return (
    <div className="flex-1 bg-gs-navy-50/40 px-4 py-12 md:py-16">
      <article className="max-w-[820px] mx-auto bg-white rounded-toss-card shadow-toss-card p-8 md:p-12 prose prose-sm md:prose-base max-w-none">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] mb-2 text-gs-text-strong">
          이용약관
        </h1>
        <p className="text-gs-muted-soft text-sm">시행일: {effectiveDate}</p>
        <div dangerouslySetInnerHTML={{ __html: body }} />
      </article>
    </div>
  );
}
