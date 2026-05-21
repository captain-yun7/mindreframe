import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { findStudyContext, STUDY_ALL } from "@/lib/study-content";

export async function generateStaticParams() {
  return STUDY_ALL.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ctx = findStudyContext(slug);
  return { title: ctx ? ctx.item.title : "알고가기" };
}

export default async function StudyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = findStudyContext(slug);
  if (!ctx) notFound();
  const { item, groupTitle, prev, next } = ctx;

  return (
    <div className="flex-1 bg-gs-bg px-4 py-8">
      <article className="max-w-[760px] mx-auto bg-white rounded-[18px] shadow-gs-card border border-gs-line-soft p-7 md:p-10">
        <Link
          href="/study"
          className="inline-flex items-center text-sm text-gs-muted hover:text-gs-text-strong mb-4"
        >
          ← 알고가기
        </Link>

        <span className="inline-block mb-3 px-3 py-1 rounded-full bg-gs-blue-soft text-gs-blue-soft-fg text-xs font-bold">
          {groupTitle}
        </span>

        <h1 className="text-2xl md:text-3xl font-black leading-[1.4] mb-2">{item.title}</h1>
        <p className="text-base text-gs-text-soft mb-6">{item.sub}</p>

        <div
          className="study-body text-[15px] leading-[1.85] text-gs-text-strong"
          dangerouslySetInnerHTML={{ __html: item.body }}
        />

        <nav className="mt-10 pt-6 border-t border-gs-line-soft flex items-center justify-between gap-3">
          {prev ? (
            <Link
              href={`/study/${prev.slug}`}
              className="flex-1 min-w-0 rounded-[12px] px-4 py-3 bg-gs-surface-mid hover:bg-gs-surface-muted border border-gs-line-soft"
            >
              <div className="text-[11px] text-gs-muted">← 이전</div>
              <div className="text-sm font-bold truncate">{prev.title}</div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {next ? (
            <Link
              href={`/study/${next.slug}`}
              className="flex-1 min-w-0 rounded-[12px] px-4 py-3 bg-gs-surface-mid hover:bg-gs-surface-muted border border-gs-line-soft text-right"
            >
              <div className="text-[11px] text-gs-muted">다음 →</div>
              <div className="text-sm font-bold truncate">{next.title}</div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </nav>
      </article>
    </div>
  );
}
