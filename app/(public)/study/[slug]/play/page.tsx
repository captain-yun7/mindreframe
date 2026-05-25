import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getVideoUrl } from "@/lib/video/r2-video";
import { normalizePlan, planAtLeast, type Plan } from "@/lib/auth/plan";
import { VideoPlayer } from "./video-player";

interface ArticleRow {
  slug: string;
  title: string;
  video_url: string | null;
  required_plan: string | null;
}

export const dynamic = "force-dynamic";

export default async function StudyPlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ autoplay?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const autoplay = sp.autoplay === "1";

  const supabase = await createSupabaseServerClient();
  let article: ArticleRow | null = null;
  {
    const res = await supabase
      .from("study_articles")
      .select("slug, title, video_url, required_plan")
      .eq("slug", slug)
      .maybeSingle();
    if (
      res.error &&
      (res.error.code === "42703" ||
        /video_url|required_plan/.test(res.error.message))
    ) {
      // 컬럼 미적용 환경 — fallback: slug/title만
      const r2 = await supabase
        .from("study_articles")
        .select("slug, title")
        .eq("slug", slug)
        .maybeSingle();
      if (r2.data) {
        article = {
          slug: (r2.data as { slug: string }).slug,
          title: (r2.data as { title: string }).title,
          video_url: null,
          required_plan: null,
        };
      }
    } else if (!res.error && res.data) {
      article = res.data as ArticleRow;
    }
  }

  if (!article) notFound();

  // plan gate
  if (article.required_plan) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(`/login?next=/study/${slug}/play`);
    }
    const { data: u } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();
    const currentPlan: Plan = normalizePlan(
      (u as { plan?: string } | null)?.plan,
    );
    const required = normalizePlan(article.required_plan);
    if (!planAtLeast(currentPlan, required)) {
      redirect(`/pricing?required=${required}&from=/study/${slug}/play`);
    }
  }

  const videoUrl = await getVideoUrl(article.video_url);

  return (
    <div className="flex-1 bg-gs-navy-50/40 px-4 py-10 md:py-14">
      <div className="max-w-[800px] mx-auto">
        <Link
          href={`/study/${slug}`}
          className="inline-flex items-center text-sm text-gs-muted hover:text-gs-navy-bright mb-5 transition-colors"
        >
          ← 본문으로
        </Link>
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-[-0.03em] leading-[1.2] mb-5 text-gs-text-strong">
          {article.title}
        </h1>

        {videoUrl ? (
          <VideoPlayer videoUrl={videoUrl} autoplay={autoplay} />
        ) : (
          <div
            data-testid="video-placeholder"
            className="w-full aspect-video bg-white rounded-toss-card flex flex-col items-center justify-center text-gs-muted shadow-toss-card border border-gs-line-soft"
          >
            <p className="text-base font-bold">영상 준비 중입니다</p>
            <p className="text-xs mt-1">콘텐츠 업로드 후 다시 방문해주세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
