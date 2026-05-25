-- ─────────────────────────────────────────────────────────────
-- F78 hotfix — Cloudflare Stream → R2 presigned URL 패턴 전환
-- 영상 자산이 100~150개로 제한적이라 R2 free tier(10GB)로 충분
-- 기존 video_id 컬럼은 rollback 안전성 위해 유지 (NULL로 두면 무시됨)
-- 신규 video_url: R2 객체 키 (예: 'video/study-core-1.mp4')
-- ─────────────────────────────────────────────────────────────

-- study_articles — 영상 객체 키
ALTER TABLE public.study_articles
  ADD COLUMN IF NOT EXISTS video_url varchar(512);

-- notification_videos — 100일 알림 3분 영상 객체 키
ALTER TABLE public.notification_videos
  ADD COLUMN IF NOT EXISTS video_url varchar(512);

COMMENT ON COLUMN public.study_articles.video_url IS
  'R2 객체 키 (예: video/study-core-1.mp4). presigned URL로 30분 만료 발급';
COMMENT ON COLUMN public.notification_videos.video_url IS
  'R2 객체 키 (예: video/notify-day-1.mp4). presigned URL로 30분 만료 발급';
