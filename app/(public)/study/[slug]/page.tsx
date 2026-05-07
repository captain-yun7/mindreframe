import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getStudyArticle, STUDY_ARTICLES } from "@/lib/study-content";
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase-server";
import { normalizePlan, planAtLeast } from "@/lib/auth/plan";

const CATEGORY_LABEL: Record<string, string> = {
  essential: "필수",
  concept: "개념",
  thought: "사고",
  fake: "가짜생각",
  change: "변화",
};

export async function generateStaticParams() {
  return STUDY_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getStudyArticle(slug);
  return { title: article ? article.title : "알고가기" };
}

export default async function StudyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getStudyArticle(slug);
  if (!article) notFound();

  // 로그인된 사용자의 plan 조회 (영상 유료 게이팅용)
  const user = await getCurrentUser();
  let plan: ReturnType<typeof normalizePlan> = "free";
  if (user) {
    const supabase = await createSupabaseServerClient();
    const { data: profile } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();
    plan = normalizePlan(profile?.plan);
  }
  const canWatchVideo = planAtLeast(plan, "light");

  // 본문 단락 분리
  const paragraphs = article.body.split(/\n\n+/);

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
          {CATEGORY_LABEL[article.category] ?? "기타"}
        </span>

        <h1 className="text-2xl md:text-3xl font-black leading-[1.4] mb-2">{article.title}</h1>
        <p className="text-base text-gs-text-soft mb-6">{article.desc}</p>

        {/* 본문 (글자 = 무료) */}
        <div className="space-y-4 text-[15px] leading-[1.85] text-gs-text-strong whitespace-pre-line">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {/* 영상 영역 (유료) */}
        <section className="mt-10 pt-6 border-t border-gs-line-soft">
          <h2 className="text-lg font-black mb-3">📺 영상으로 보기</h2>
          {article.videoUrl && canWatchVideo ? (
            <video src={article.videoUrl} controls className="w-full rounded-[14px]" />
          ) : article.videoUrl && !canWatchVideo ? (
            <div className="rounded-[14px] bg-gs-surface-muted border border-gs-line-soft p-6 text-center">
              <p className="text-sm text-gs-text-soft mb-3">
                영상 콘텐츠는 라이트 AI 이상 플랜에서 시청하실 수 있어요.
              </p>
              <Link
                href="/pricing"
                className="inline-block px-5 py-2.5 rounded-full bg-gs-blue text-white text-sm font-bold hover:bg-gs-blue-hover"
              >
                플랜 보러 가기
              </Link>
            </div>
          ) : (
            <div className="rounded-[14px] bg-gs-surface-muted border border-gs-line-soft p-6 text-center text-sm text-gs-muted">
              영상 콘텐츠 준비 중입니다.
            </div>
          )}
        </section>
      </article>
    </div>
  );
}
