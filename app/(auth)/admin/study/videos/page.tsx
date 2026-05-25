import Link from "next/link";
import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { requireAdmin } from "@/lib/auth/admin";
import { VideosTable, type VideoRow } from "./videos-table";

export default async function AdminNotificationVideosPage() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("notification_videos")
    .select("day_number, title, description, video_id, duration_seconds")
    .order("day_number", { ascending: true });

  const rows = (data ?? []) as VideoRow[];
  const filled = rows.filter((r) => r.video_id).length;

  return (
    <PageLayout>
      <Link href="/admin/study" className="text-sm text-gs-blue">
        ← 알고가기 목록
      </Link>
      <PageTitle>100일 알림 영상</PageTitle>
      <PageLead>
        일차별 3분 영상 100개. Cloudflare Stream UID를 입력하면 카카오 알림톡 링크에
        사용됩니다.
      </PageLead>
      <div className="text-xs text-gs-muted mt-2 mb-4">등록 {filled}/100</div>

      {error ? (
        <div className="p-4 bg-gs-warn-bg border border-gs-warn-border rounded-[10px] text-sm text-gs-warn mb-4">
          notification_videos 테이블이 아직 생성되지 않았습니다.{" "}
          <code>supabase/migrations/20260526_notification_videos.sql</code>을
          적용해주세요.
        </div>
      ) : null}

      {rows.length > 0 ? <VideosTable rows={rows} /> : null}
    </PageLayout>
  );
}
