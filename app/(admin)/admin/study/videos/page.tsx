import { PageHeader } from "../../_ui/page-header";
import { requireAdmin } from "@/lib/auth/admin";
import { VideosTable, type VideoRow } from "./videos-table";

export default async function AdminNotificationVideosPage() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("notification_videos")
    .select("day_number, title, description, video_url, duration_seconds")
    .order("day_number", { ascending: true });

  const rows = (data ?? []) as VideoRow[];
  const filled = rows.filter((r) => r.video_url).length;

  return (
    <>
      <PageHeader
        backHref="/admin/study"
        backLabel="← 알고가기 목록"
        title="100일 알림 영상"
        desc={
          <>
            일차별 3분 영상 100개. R2 버킷에 mp4 업로드 후 객체 키(예:{" "}
            <code>video/notify-day-1.mp4</code>)를 입력하면 페이지 재생 시 30분
            만료 presigned URL이 발급됩니다. 720p mp4 권장 (모바일 대역폭).
          </>
        }
      />
      <div className="text-xs text-gs-muted mt-2 mb-4">등록 {filled}/100</div>

      {error ? (
        <div className="p-4 bg-gs-warn-bg border border-gs-warn-border rounded-[10px] text-sm text-gs-warn mb-4">
          notification_videos 테이블이 아직 생성되지 않았거나 video_url 컬럼이 없습니다.{" "}
          <code>supabase/migrations/20260526_notification_videos.sql</code> +{" "}
          <code>20260601_study_video_url.sql</code>을 적용해주세요.
        </div>
      ) : null}

      {rows.length > 0 ? <VideosTable rows={rows} /> : null}
    </>
  );
}
