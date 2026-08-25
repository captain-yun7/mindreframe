/**
 * 브라우저에서 MP4/MOV 파일의 비디오 코덱을 간이 감지 (업로드 전 HEVC 차단용).
 *
 * stsd 박스의 codec fourcc(avc1/hvc1/hev1 등)를 파일 앞·뒤 슬라이스에서 바이트 스캔.
 * moov가 파일 끝에 있는 경우(비-faststart)가 흔해서 양끝을 모두 읽는다.
 * 판단 불가 시 "unknown" (업로드는 허용 — fail open).
 */
export type DetectedCodec = "h264" | "hevc" | "unknown";

const SCAN_BYTES = 12 * 1024 * 1024; // 앞뒤 각 12MB

export async function detectVideoCodec(file: File): Promise<DetectedCodec> {
  try {
    const head = new Uint8Array(
      await file.slice(0, Math.min(SCAN_BYTES, file.size)).arrayBuffer(),
    );
    const tail =
      file.size > SCAN_BYTES
        ? new Uint8Array(await file.slice(file.size - SCAN_BYTES).arrayBuffer())
        : new Uint8Array(0);

    const hasHevc =
      containsAscii(head, "hvc1") || containsAscii(head, "hev1") ||
      containsAscii(tail, "hvc1") || containsAscii(tail, "hev1");
    const hasAvc =
      containsAscii(head, "avc1") || containsAscii(tail, "avc1");

    if (hasHevc) return "hevc";
    if (hasAvc) return "h264";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function containsAscii(buf: Uint8Array, needle: string): boolean {
  const n = [...needle].map((c) => c.charCodeAt(0));
  outer: for (let i = 0; i <= buf.length - n.length; i++) {
    for (let j = 0; j < n.length; j++) {
      if (buf[i + j] !== n[j]) continue outer;
    }
    return true;
  }
  return false;
}
