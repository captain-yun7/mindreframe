/**
 * chat_analyses.alternative_thought 하위 호환 파서.
 *
 * 신규 포맷(원본 복원 후): JSON 직렬화된 배열 `[{ "인지왜곡": "...", "합리적사고": "..." }, ...]`
 * 레거시 포맷: 단일 plain text (한 줄 대안사고)
 *
 * UI에서 그대로 표시 가능한 텍스트로 변환한다.
 */

export interface RationalPair {
  distortion: string;
  rational: string;
}

export interface AlternativeThoughtView {
  /** 사람이 읽을 멀티라인 텍스트 */
  text: string;
  /** 신규 포맷이면 분리된 배열, 레거시면 빈 배열 */
  pairs: RationalPair[];
  /** 원본 raw 값 */
  raw: string;
}

export function parseAlternativeThought(
  value: string | null | undefined,
): AlternativeThoughtView {
  if (!value) return { text: "", pairs: [], raw: "" };
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) {
    return { text: trimmed, pairs: [], raw: trimmed };
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      const pairs: RationalPair[] = parsed
        .map((p) => ({
          distortion: typeof p?.인지왜곡 === "string" ? p.인지왜곡 : "",
          rational: typeof p?.합리적사고 === "string" ? p.합리적사고 : "",
        }))
        .filter((p) => p.distortion || p.rational);
      const text = pairs.map((p) => `${p.distortion}: ${p.rational}`).join("\n");
      return { text, pairs, raw: trimmed };
    }
    return { text: trimmed, pairs: [], raw: trimmed };
  } catch {
    return { text: trimmed, pairs: [], raw: trimmed };
  }
}

export interface EmotionsView {
  before: number | null;
  after: number | null;
  name: string | null;
}

export function parseEmotions(
  value: unknown,
): EmotionsView {
  if (!value || typeof value !== "object") {
    return { before: null, after: null, name: null };
  }
  const v = value as Record<string, unknown>;
  return {
    before: typeof v.before === "number" ? v.before : null,
    after: typeof v.after === "number" ? v.after : null,
    name: typeof v.name === "string" ? v.name : null,
  };
}
