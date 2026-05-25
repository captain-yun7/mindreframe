import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getVideoUrl } from "@/lib/video/r2-video";
import { VideoPlayer } from "@/app/(public)/study/[slug]/play/video-player";

export const dynamic = "force-dynamic";

function computeDayNumber(startedAt: string): number {
  const start = new Date(`${startedAt}T00:00:00+09:00`);
  const diff = Math.floor((Date.now() - start.getTime()) / 86_400_000) + 1;
  return Math.min(100, Math.max(1, diff));
}

/**
 * F78 — 100일 알림톡 정적 fallback URL.
 *   카카오 알림톡 동적 URL 검수 통과 전까지 사용.
 *   사용자 인증 후 notifications_started_at 기반으로 day_number 계산 →
 *   notification_videos 테이블에서 해당 day의 video_url(R2 객체 키) → presigned URL 재생.
 */
export default async function StudyTodayPlayPage({
  searchParams,
}: {
  searchParams: Promise<{ autoplay?: string }>;
}) {
  const sp = await searchParams;
  const autoplay = sp.autoplay === "1";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/study/today/play");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("notifications_started_at")
    .eq("id", user.id)
    .single();

  const startedRaw =
    (profile as { notifications_started_at?: string | null } | null)
      ?.notifications_started_at ?? null;

  if (!startedRaw) {
    return (
      <div className="flex-1 bg-gs-bg px-4 py-8">
        <div className="max-w-[640px] mx-auto bg-white rounded-[18px] border border-gs-line-soft p-7 text-center">
          <p className="text-base font-bold">알림이 아직 시작되지 않았어요</p>
          <p className="text-sm text-gs-muted mt-2">
            마이페이지에서 알림을 활성화하면 100일 영상이 차례대로 재생됩니다.
          </p>
          <Link
            href="/mypage"
            className="inline-block mt-4 px-4 py-2 rounded-[10px] bg-gs-blue text-white text-sm font-bold"
          >
            마이페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  const dayNumber = computeDayNumber(startedRaw);

  // 마이그 미적용 환경 fallback — video_url 컬럼 부재 시 video_id 기준 select 재시도
  let videoRow:
    | { title?: string; video_url?: string | null; duration_seconds?: number | null }
    | null = null;
  {
    const res = await supabase
      .from("notification_videos")
      .select("title, video_url, duration_seconds")
      .eq("day_number", dayNumber)
      .maybeSingle();
    if (
      res.error &&
      (res.error.code === "42703" || /video_url/.test(res.error.message))
    ) {
      const r2 = await supabase
        .from("notification_videos")
        .select("title, duration_seconds")
        .eq("day_number", dayNumber)
        .maybeSingle();
      if (r2.data) {
        videoRow = r2.data as {
          title?: string;
          duration_seconds?: number | null;
        };
      }
    } else if (!res.error) {
      videoRow = res.data as typeof videoRow;
    }
  }

  const videoUrl = await getVideoUrl(videoRow?.video_url ?? null);

  return (
    <div className="flex-1 bg-gs-navy-50/40 px-4 py-10 md:py-14">
      <div className="max-w-[800px] mx-auto">
        <Link
          href="/study"
          className="inline-flex items-center text-sm text-gs-muted hover:text-gs-navy-bright mb-5 transition-colors"
        >
          ← 알고가기
        </Link>
        <div className="mb-5">
          <p className="text-sm font-bold text-gs-navy-bright">{dayNumber}일차</p>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-[-0.03em] leading-[1.2] mt-1 text-gs-text-strong">
            {videoRow?.title ?? `${dayNumber}일차 영상`}
          </h1>
        </div>

        {videoUrl ? (
          <VideoPlayer videoUrl={videoUrl} autoplay={autoplay} />
        ) : (
          <div
            data-testid="video-placeholder-today"
            className="w-full aspect-video bg-white rounded-toss-card flex flex-col items-center justify-center text-gs-muted shadow-toss-card border border-gs-line-soft"
          >
            <p className="text-base font-bold">영상 준비 중입니다</p>
            <p className="text-xs mt-1">
              {dayNumber}일차 영상이 곧 업로드될 예정이에요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
