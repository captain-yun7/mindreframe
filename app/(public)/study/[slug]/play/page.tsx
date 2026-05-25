import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getStreamPlayback } from "@/lib/video/cloudflare-stream";
import { normalizePlan, planAtLeast, type Plan } from "@/lib/auth/plan";
import { VideoPlayer } from "./video-player";

interface ArticleRow {
  slug: string;
  title: string;
  video_id: string | null;
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
      .select("slug, title, video_id, required_plan")
      .eq("slug", slug)
      .maybeSingle();
    if (
      res.error &&
      (res.error.code === "42703" ||
        /video_id|required_plan/.test(res.error.message))
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
          video_id: null,
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

  const playback = await getStreamPlayback(article.video_id);

  return (
    <div className="flex-1 bg-gs-bg px-4 py-8">
      <div className="max-w-[760px] mx-auto">
        <Link
          href={`/study/${slug}`}
          className="inline-flex items-center text-sm text-gs-muted hover:text-gs-text-strong mb-4"
        >
          ← 본문으로
        </Link>
        <h1 className="text-2xl md:text-3xl font-black leading-[1.4] mb-4">
          {article.title}
        </h1>

        {playback ? (
          <VideoPlayer
            hlsUrl={playback.hlsUrl}
            posterUrl={playback.posterUrl}
            autoplay={autoplay}
          />
        ) : (
          <div
            data-testid="video-placeholder"
            className="w-full aspect-video bg-gs-surface-mid rounded-[12px] flex flex-col items-center justify-center text-gs-muted"
          >
            <p className="text-base font-bold">영상 준비 중입니다</p>
            <p className="text-xs mt-1">콘텐츠 업로드 후 다시 방문해주세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
