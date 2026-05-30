import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { findStudyContext, STUDY_ALL } from "@/lib/study-content"; // fallback
import { sanitizeContentHtml } from "@/lib/sanitize-html";
import { StudyProgressLink } from "@/components/study/study-progress-modal";
import { QuickNav } from "@/components/quick-nav";

const CATEGORY_GROUP_TITLE: Record<string, string> = {
  core: "필수",
  distortion: "인지왜곡(통일 명칭)",
  body: "불안과 몸",
  avoidance: "회피와 행동",
  rumination: "반추는 소의 되새김질",
};

const CATEGORY_ORDER = ["core", "distortion", "body", "avoidance", "rumination"];

interface ArticleCtx {
  item: { slug: string; title: string; sub: string; body: string };
  groupTitle: string;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

async function fetchArticleCtx(slug: string): Promise<ArticleCtx | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("study_articles")
    .select("slug, category, title, sub, body_html, order_index")
    .order("order_index", { ascending: true });

  if (error || !data || data.length === 0) {
    // fallback — 코드 박힘 데이터
    const ctx = findStudyContext(slug);
    if (!ctx) return null;
    return {
      item: ctx.item,
      groupTitle: ctx.groupTitle,
      prev: ctx.prev ? { slug: ctx.prev.slug, title: ctx.prev.title } : null,
      next: ctx.next ? { slug: ctx.next.slug, title: ctx.next.title } : null,
    };
  }

  // 카테고리 순서로 정렬: core → distortion → body → avoidance → rumination
  const sorted = [...data].sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category as string);
    const cb = CATEGORY_ORDER.indexOf(b.category as string);
    if (ca !== cb) return ca - cb;
    return (a.order_index as number) - (b.order_index as number);
  });

  const idx = sorted.findIndex((a) => a.slug === slug);
  if (idx < 0) return null;
  const cur = sorted[idx];
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;

  return {
    item: {
      slug: cur.slug as string,
      title: cur.title as string,
      sub: (cur.sub as string | null) ?? "",
      body: cur.body_html as string,
    },
    groupTitle: CATEGORY_GROUP_TITLE[cur.category as string] ?? "기타",
    prev: prev ? { slug: prev.slug as string, title: prev.title as string } : null,
    next: next ? { slug: next.slug as string, title: next.title as string } : null,
  };
}

// 빌드 시점에 DB 정상이면 실제 slug로 정적 생성, 실패 시 fallback.
// 신규 글·삭제 글은 dynamicParams + revalidatePath로 즉시 반영.
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("study_articles")
      .select("slug");
    if (!error && data && data.length > 0) {
      return data.map((a) => ({ slug: a.slug as string }));
    }
  } catch {
    // 빌드 시점 DB 접근 실패 시 fallback
  }
  return STUDY_ALL.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await fetchArticleCtx(slug);
  return { title: ctx ? ctx.item.title : "알고가기" };
}

export const revalidate = 300;

export default async function StudyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await fetchArticleCtx(slug);
  if (!ctx) notFound();
  const { item, groupTitle, prev, next } = ctx;

  return (
    <div className="flex-1 bg-gs-navy-50/40 px-4 py-10 md:py-14">
      <article className="max-w-[800px] mx-auto bg-white rounded-toss-card shadow-toss-card border border-gs-line-soft p-7 md:p-12">
        <Link
          href="/study"
          className="inline-flex items-center text-sm text-gs-muted hover:text-gs-navy-bright mb-4 transition-colors"
        >
          ← 알고가기
        </Link>

        <span className="inline-block mb-4 px-3 py-1.5 rounded-full bg-gs-navy-50 text-gs-navy-bright text-xs font-bold">
          {groupTitle}
        </span>

        <h1 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] leading-[1.2] mb-3 text-gs-text-strong">
          {item.title}
        </h1>
        <p className="text-base md:text-lg text-gs-muted-soft mb-7 leading-relaxed">
          {item.sub}
        </p>

        <div
          className="study-body text-[15px] md:text-[16px] leading-[1.85] text-gs-text-strong"
          dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(item.body) }}
        />

        <nav className="mt-12 pt-6 border-t border-gs-line-soft flex items-center justify-between gap-3">
          {prev ? (
            <Link
              href={`/study/${prev.slug}`}
              className="flex-1 min-w-0 rounded-toss-button px-4 py-3 bg-gs-navy-50/60 hover:bg-gs-navy-50 border border-gs-line-soft hover:-translate-y-0.5 hover:shadow-toss-card transition-all"
            >
              <div className="text-[11px] text-gs-muted">← 이전</div>
              <div className="text-sm font-bold truncate">{prev.title}</div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {next ? (
            // K4·F165·F166 — 다음 글 클릭 시 응원 카드 모달
            <StudyProgressLink
              href={`/study/${next.slug}`}
              nextTitle={next.title}
              className="flex-1 min-w-0 rounded-toss-button px-4 py-3 bg-gs-navy-50/60 hover:bg-gs-navy-50 border border-gs-line-soft text-right hover:-translate-y-0.5 hover:shadow-toss-card transition-all cursor-pointer"
            >
              <div className="text-[11px] text-gs-muted">다음 →</div>
              <div className="text-sm font-bold truncate">{next.title}</div>
            </StudyProgressLink>
          ) : (
            <div className="flex-1" />
          )}
        </nav>
      </article>

      {/* K4·F172 — 페이지 푸터 "이동할 곳을 선택해주세요" */}
      <div className="max-w-[800px] mx-auto">
        <QuickNav />
      </div>
    </div>
  );
}
