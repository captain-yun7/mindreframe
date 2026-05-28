import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getTodayDailyVideo } from "@/lib/actions/daily-video";
import { DailyVideoPlayer } from "@/components/daily-video-player";
import { QuickNav } from "@/components/quick-nav";

export const dynamic = "force-dynamic";

/**
 * F78 — 100일 알림 영상 풀스크린 재생 페이지.
 *   사용자 인증 후 notifications_started_at 기반으로 day_number 계산 →
 *   notification_videos 테이블에서 해당 day의 video_url(R2 객체 키) → presigned URL 재생.
 *   70% 도달 시 routine_checks(item_key='daily_video') 자동 INSERT.
 */
export default async function StudyTodayPlayPage({
  searchParams,
}: {
  searchParams: Promise<{ autoplay?: string }>;
}) {
  const sp = await searchParams;
  const autoplay = sp.autoplay === "1";

  // 미로그인 → /login으로 (getTodayDailyVideo 이전에 supabase 세션만 확인)
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/study/today/play");
  }

  const result = await getTodayDailyVideo();

  if (!result.ok && result.reason === "not_started") {
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

  // no_user는 위에서 redirect로 걸렀음 — 도달 X. no_row는 사용자 실제 일차 유지.
  const dayNumber = result.ok
    ? result.dayNumber
    : result.reason === "no_row"
      ? result.dayNumber
      : 1;
  const title = result.ok ? result.title : `${dayNumber}일차 영상`;
  const videoUrl = result.ok ? result.videoUrl : null;

  return (
    <div className="flex-1 bg-gs-navy-50/40 px-4 py-10 md:py-14">
      <div className="max-w-[800px] mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gs-muted hover:text-gs-navy-bright mb-5 transition-colors"
        >
          ← 대시보드
        </Link>
        <div className="mb-5">
          <p className="text-sm font-bold text-gs-navy-bright">
            {dayNumber}일차
          </p>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-[-0.03em] leading-[1.2] mt-1 text-gs-text-strong">
            {title}
          </h1>
        </div>

        {videoUrl ? (
          <DailyVideoPlayer
            videoUrl={videoUrl}
            dayNumber={dayNumber}
            autoplay={autoplay}
          />
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

        <p className="mt-4 text-xs text-gs-muted text-center">
          영상을 70% 이상 시청하면 오늘의 루틴에 자동으로 체크돼요
        </p>
        <QuickNav />
      </div>
    </div>
  );
}
