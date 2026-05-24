import type { Metadata } from "next";
import {
  FALLBACK_PRIVACY_HTML,
  applyPlaceholders,
  getSiteSettings,
} from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "개인정보처리방침",
};

export const revalidate = 300;

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  const rawBody = settings.privacy_html || FALLBACK_PRIVACY_HTML;
  const body = applyPlaceholders(rawBody, settings);
  const effectiveDate = settings.effective_date || "2026-05-01";

  return (
    <div className="flex-1 bg-gs-bg px-4 py-12">
      <article className="max-w-[820px] mx-auto bg-white rounded-[18px] shadow-gs-card p-8 md:p-12 prose prose-sm md:prose-base max-w-none">
        <h1 className="text-2xl md:text-3xl font-black mb-2">개인정보처리방침</h1>
        <p className="text-gs-muted-soft text-sm">시행일: {effectiveDate}</p>
        <div dangerouslySetInnerHTML={{ __html: body }} />
      </article>
    </div>
  );
}
