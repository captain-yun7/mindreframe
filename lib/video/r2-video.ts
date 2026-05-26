import "server-only";

import { presignR2, readR2Config } from "./r2-sigv4";

/**
 * Cloudflare R2 presigned URL 발급기 (server-only).
 *
 * SigV4 코어는 `./r2-sigv4`로 분리 — 스크립트에서 import 가능.
 *
 * ENV (모두 부재 시 함수가 null 반환 → 호출자는 placeholder 노출):
 *   R2_ACCESS_KEY_ID      — R2 API 토큰 Access Key
 *   R2_SECRET_ACCESS_KEY  — R2 API 토큰 Secret
 *   R2_BUCKET_NAME        — 버킷 이름 (예: mindreframe-assets)
 *   R2_ENDPOINT           — https://<account>.r2.cloudflarestorage.com
 *
 * 사용:
 *   const url = await getVideoUrl('video/day-1.mp4');
 *   // → 30분 만료 GET presigned URL or null
 *
 *   const put = await getVideoUploadUrl('video/day-1.mp4', 'video/mp4', 600);
 *   // → 10분 만료 PUT presigned URL or null
 *
 * 참조: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
 */

const DEFAULT_EXPIRES_SECONDS = 60 * 30; // 30분
const DEFAULT_UPLOAD_EXPIRES_SECONDS = 60 * 10; // 10분

/**
 * R2 GET presigned URL을 발급한다.
 * @param videoKey   객체 키 (예: 'video/day-1.mp4'). 빈 값 → null
 * @param expiresIn  만료 초 (기본 1800 = 30분)
 * @returns presigned URL 또는 null (ENV 미설정/입력 불량)
 */
export async function getVideoUrl(
  videoKey: string | null | undefined,
  expiresIn: number = DEFAULT_EXPIRES_SECONDS,
): Promise<string | null> {
  if (!videoKey || videoKey.trim().length === 0) return null;
  const cfg = readR2Config();
  if (!cfg) return null;

  try {
    return await presignR2(cfg, "GET", videoKey, expiresIn);
  } catch (e) {
    console.error("[r2-video] GET presign failed:", e);
    return null;
  }
}

/**
 * R2 PUT presigned URL을 발급한다. (어드민 업로드/스크립트 일괄 업로드용)
 *
 * Vercel 50MB body 한계를 피하기 위해 클라이언트가 R2로 직접 PUT한다.
 * `host`만 서명하므로 클라이언트는 임의의 Content-Type/Content-Length 헤더를
 * 추가할 수 있다 (R2 CORS 설정에서 해당 헤더 허용 필요).
 *
 * @param videoKey      객체 키 (예: 'video/day-1.mp4'). 빈 값 → null
 * @param contentType   PUT 시 클라이언트가 보낼 Content-Type (서명에는 미포함)
 * @param expiresIn     만료 초 (기본 600 = 10분, 큰 파일은 1800 권장)
 * @returns { url, bucket, objectKey } 또는 null
 */
export async function getVideoUploadUrl(
  videoKey: string,
  contentType: string = "video/mp4",
  expiresIn: number = DEFAULT_UPLOAD_EXPIRES_SECONDS,
): Promise<{ url: string; bucket: string; objectKey: string; contentType: string } | null> {
  if (!videoKey || videoKey.trim().length === 0) return null;
  const cfg = readR2Config();
  if (!cfg) return null;

  try {
    const url = await presignR2(cfg, "PUT", videoKey, expiresIn);
    return {
      url,
      bucket: cfg.bucket,
      objectKey: videoKey.trim().replace(/^\/+/, ""),
      contentType,
    };
  } catch (e) {
    console.error("[r2-video] PUT presign failed:", e);
    return null;
  }
}

/**
 * 알림톡 fallback용 — 현재는 정적 URL (`/study/today/play`).
 * 카카오 검수 통과 후 동적 day 포함 URL로 교체 가능.
 */
export function getNotificationVideoFallbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mindreframe.net";
  return `${base}/study/today/play?autoplay=1`;
}
