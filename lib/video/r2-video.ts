import "server-only";

/**
 * Cloudflare R2 presigned URL 발급기.
 *
 * R2는 S3 호환 — AWS Signature V4(HMAC-SHA256) GET presigned URL.
 * `@aws-sdk` 의존성 없이 Web Crypto API로 직접 서명한다.
 *
 * ENV (모두 부재 시 함수가 null 반환 → 호출자는 placeholder 노출):
 *   R2_ACCESS_KEY_ID      — R2 API 토큰 Access Key
 *   R2_SECRET_ACCESS_KEY  — R2 API 토큰 Secret
 *   R2_BUCKET_NAME        — 버킷 이름 (예: mindreframe-assets)
 *   R2_ENDPOINT           — https://<account>.r2.cloudflarestorage.com (slash 없이)
 *
 * 사용:
 *   const url = await getVideoUrl('video/study-core-1.mp4');
 *   // → 30분 만료 GET presigned URL or null
 *
 * 참조: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
 */

const REGION = "auto"; // R2는 region이 'auto'
const SERVICE = "s3";
const DEFAULT_EXPIRES_SECONDS = 60 * 30; // 30분

export type R2Config = {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string; // https://<account>.r2.cloudflarestorage.com
};

function readConfig(): R2Config | null {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const endpoint = process.env.R2_ENDPOINT;
  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) return null;
  return {
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: endpoint.replace(/\/+$/, ""),
  };
}

async function hmacSha256(
  key: ArrayBuffer | string,
  data: string,
): Promise<ArrayBuffer> {
  const keyBuf = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return bufToHex(buf);
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * RFC 3986 — S3 path segment 인코딩.
 * 슬래시는 segment 구분자라 인코딩하지 않는다.
 */
function encodeObjectKey(key: string): string {
  return key
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join("/");
}

function isoDateTime(date: Date): { amzDate: string; dateStamp: string } {
  const amzDate = date
    .toISOString()
    .replace(/[:-]|\.\d{3}/g, ""); // 20240101T120000Z
  const dateStamp = amzDate.slice(0, 8); // 20240101
  return { amzDate, dateStamp };
}

/**
 * R2 GET presigned URL을 발급한다.
 * @param videoKey   객체 키 (예: 'video/study-core-1.mp4'). 빈 값 → null
 * @param expiresIn  만료 초 (기본 1800 = 30분)
 * @returns presigned URL 또는 null (ENV 미설정/입력 불량)
 */
export async function getVideoUrl(
  videoKey: string | null | undefined,
  expiresIn: number = DEFAULT_EXPIRES_SECONDS,
): Promise<string | null> {
  if (!videoKey || videoKey.trim().length === 0) return null;
  const cfg = readConfig();
  if (!cfg) return null;

  try {
    const key = videoKey.trim().replace(/^\/+/, "");
    const endpointUrl = new URL(cfg.endpoint);
    const host = endpointUrl.host;
    const encodedKey = encodeObjectKey(key);
    const canonicalUri = `/${cfg.bucket}/${encodedKey}`;

    const now = new Date();
    const { amzDate, dateStamp } = isoDateTime(now);
    const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;

    const params: Record<string, string> = {
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${cfg.accessKeyId}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(expiresIn),
      "X-Amz-SignedHeaders": "host",
    };

    const canonicalQuery = Object.keys(params)
      .sort()
      .map(
        (k) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(
            /[!'()*]/g,
            (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
          )}`,
      )
      .join("&");

    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = "host";
    const payloadHash = "UNSIGNED-PAYLOAD";

    const canonicalRequest = [
      "GET",
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      await sha256Hex(canonicalRequest),
    ].join("\n");

    // 서명 키 파생
    const kDate = await hmacSha256(`AWS4${cfg.secretAccessKey}`, dateStamp);
    const kRegion = await hmacSha256(kDate, REGION);
    const kService = await hmacSha256(kRegion, SERVICE);
    const kSigning = await hmacSha256(kService, "aws4_request");
    const signature = bufToHex(await hmacSha256(kSigning, stringToSign));

    return `${cfg.endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  } catch (e) {
    console.error("[r2-video] presign failed:", e);
    return null;
  }
}

/**
 * 알림톡 fallback용 — 현재는 정적 URL (`/study/today/play`).
 * 카카오 검수 통과 후 동적 day 포함 URL로 교체 가능.
 * (cloudflare-stream.ts의 동명 함수에서 이전)
 */
export function getNotificationVideoFallbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mindreframe.net";
  return `${base}/study/today/play?autoplay=1`;
}
