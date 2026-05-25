import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getStreamPlayback } from "@/lib/video/cloudflare-stream";
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
 *   notification_videos 테이블에서 해당 day의 video_id로 재생.
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

  const { data: video } = await supabase
    .from("notification_videos")
    .select("title, video_id, duration_seconds")
    .eq("day_number", dayNumber)
    .maybeSingle();

  const videoRow = video as
    | { title?: string; video_id?: string | null; duration_seconds?: number | null }
    | null;
  const playback = await getStreamPlayback(videoRow?.video_id ?? null);

  return (
    <div className="flex-1 bg-gs-bg px-4 py-8">
      <div className="max-w-[760px] mx-auto">
        <Link
          href="/study"
          className="inline-flex items-center text-sm text-gs-muted hover:text-gs-text-strong mb-4"
        >
          ← 알고가기
        </Link>
        <div className="mb-4">
          <p className="text-xs text-gs-muted">{dayNumber}일차</p>
          <h1 className="text-2xl md:text-3xl font-black leading-[1.4] mt-1">
            {videoRow?.title ?? `${dayNumber}일차 영상`}
          </h1>
        </div>

        {playback ? (
          <VideoPlayer
            hlsUrl={playback.hlsUrl}
            posterUrl={playback.posterUrl}
            autoplay={autoplay}
          />
        ) : (
          <div
            data-testid="video-placeholder-today"
            className="w-full aspect-video bg-gs-surface-mid rounded-[12px] flex flex-col items-center justify-center text-gs-muted"
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
