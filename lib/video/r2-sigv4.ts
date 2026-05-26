/**
 * Cloudflare R2 SigV4 presign 코어.
 *
 * `server-only` import 없음 → Next 서버 컨텍스트뿐 아니라
 * 스크립트(`scripts/upload-daily-video.ts`)에서도 직접 import 가능.
 *
 * Web Crypto API 사용 → Node 20+ / 브라우저 / Edge 런타임에서 모두 동작.
 *
 * `r2-video.ts`에서 GET/PUT presigned URL을 발급할 때 호출한다.
 */

const REGION = "auto"; // R2는 region이 'auto'
const SERVICE = "s3";

export type R2Config = {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string; // https://<account>.r2.cloudflarestorage.com
};

/**
 * 환경 변수에서 R2 설정 로드. 한 개라도 부재 시 null.
 */
export function readR2Config(): R2Config | null {
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
  key: ArrayBuffer | Uint8Array | string,
  data: string,
): Promise<ArrayBuffer> {
  const keyBuf =
    typeof key === "string" ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuf as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(data),
  );
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data),
  );
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

function encodeQueryValue(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function isoDateTime(date: Date): { amzDate: string; dateStamp: string } {
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  return { amzDate, dateStamp };
}

/**
 * R2 presigned URL 발급 코어.
 *
 * `host`만 서명 → 클라이언트가 Content-Type 등 헤더를 자유롭게 추가 가능.
 *
 * @param cfg        R2 설정
 * @param method     "GET" | "PUT" | "DELETE" 등
 * @param objectKey  R2 객체 키 (예: 'video/day-1.mp4'). 선행 슬래시는 제거된다.
 * @param expiresIn  만료 초 (1 ~ 604800)
 * @returns presigned URL 문자열
 */
export async function presignR2(
  cfg: R2Config,
  method: "GET" | "PUT" | "DELETE" | "HEAD",
  objectKey: string,
  expiresIn: number,
): Promise<string> {
  const key = objectKey.trim().replace(/^\/+/, "");
  if (!key) throw new Error("[presignR2] objectKey is empty");

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
    .map((k) => `${encodeURIComponent(k)}=${encodeQueryValue(params[k])}`)
    .join("&");

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    method,
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

  const kDate = await hmacSha256(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, REGION);
  const kService = await hmacSha256(kRegion, SERVICE);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = bufToHex(await hmacSha256(kSigning, stringToSign));

  return `${cfg.endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
