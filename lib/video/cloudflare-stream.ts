import "server-only";

/**
 * Cloudflare Stream playback URL 발급.
 *
 * ENV (모두 부재 시 함수가 null 반환 — 호출자가 placeholder 노출):
 *   CLOUDFLARE_STREAM_ACCOUNT_ID   — Cloudflare 계정 ID
 *   CLOUDFLARE_STREAM_API_TOKEN    — Stream:Read 권한 토큰 (선택, 차후 server-side fetch 시)
 *   CLOUDFLARE_STREAM_KEY_ID       — signed URL용 key ID (선택)
 *   CLOUDFLARE_STREAM_KEY_PEM      — signed URL용 PEM (선택; jose 미설치 환경에선 unsigned로 fallback)
 *
 * 동작:
 *   1) videoId 부재 또는 ACCOUNT_ID 미설정 → null 반환 ("영상 준비 중" UI 표시)
 *   2) signing 키 부재 → unsigned playback URL (자산이 public access인 경우만 재생)
 *   3) signing 키 있고 jose import 성공 → 60분 만료 RS256 JWT 발급
 *   4) jose 동적 import 실패 → unsigned URL로 fallback (운영 중단보다 평문 노출 선택)
 *
 * 참조: https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/
 */

export type StreamPlayback = {
  videoId: string;
  hlsUrl: string;
  posterUrl: string;
  signedToken: string | null;
};

export async function getStreamPlayback(
  videoId: string | null | undefined,
): Promise<StreamPlayback | null> {
  if (!videoId || videoId.trim().length === 0) return null;
  const accountId = process.env.CLOUDFLARE_STREAM_ACCOUNT_ID;
  if (!accountId) return null;

  const customerSubdomain = `customer-${accountId}.cloudflarestream.com`;
  const base = `https://${customerSubdomain}/${videoId}`;

  const keyId = process.env.CLOUDFLARE_STREAM_KEY_ID;
  const keyPem = process.env.CLOUDFLARE_STREAM_KEY_PEM;
  if (!keyId || !keyPem) {
    return {
      videoId,
      hlsUrl: `${base}/manifest/video.m3u8`,
      posterUrl: `${base}/thumbnails/thumbnail.jpg`,
      signedToken: null,
    };
  }

  // jose 미설치 환경에서도 깨지지 않도록 동적 import + try/catch
  try {
    const mod = await import("jose").catch(() => null);
    if (!mod) {
      console.warn("[cloudflare-stream] jose 미설치 — unsigned URL로 fallback");
      return {
        videoId,
        hlsUrl: `${base}/manifest/video.m3u8`,
        posterUrl: `${base}/thumbnails/thumbnail.jpg`,
        signedToken: null,
      };
    }
    const { SignJWT, importPKCS8 } = mod;
    const privateKey = await importPKCS8(keyPem, "RS256");
    const token = await new SignJWT({
      sub: videoId,
      kid: keyId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    })
      .setProtectedHeader({ alg: "RS256", kid: keyId })
      .sign(privateKey);
    return {
      videoId,
      hlsUrl: `${base}/${token}/manifest/video.m3u8`,
      posterUrl: `${base}/${token}/thumbnails/thumbnail.jpg`,
      signedToken: token,
    };
  } catch (e) {
    console.error("[cloudflare-stream] signing failed:", e);
    return {
      videoId,
      hlsUrl: `${base}/manifest/video.m3u8`,
      posterUrl: `${base}/thumbnails/thumbnail.jpg`,
      signedToken: null,
    };
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
