/**
 * K5·F183 — 반말 응답 감지·교정 helper.
 *
 * 분석기·쓰레기통·코치 chat 응답이 갑자기 반말로 나오는 경우를 잡기 위한 가벼운 휴리스틱.
 *  - 어말 종결어미 위주 검사 (~야/~지/~네/~다/~해/~봐 등)
 *  - 마침표·물음표·느낌표·인용 부호 직전만 검사 (오탐 최소화)
 *  - 합리적 사고 카드(인지왜곡 코칭) 내 의도적 반말은 예외 — 호출처에서 판단.
 */

const PLAIN_ENDINGS = [
  // ~야 ~지 ~네 ~다 ~해 ~봐 ~잖아 ~걸 ~게 ~군 ~구나 ~네 등
  "야",
  "지",
  "네",
  "다",
  "해",
  "봐",
  "잖아",
  "걸",
  "게",
  "군",
  "구나",
  "더라",
  "는데",
  "어",
  "아",
  "줘",
  "마",
];

// 정중 어미 후보 — 한 문장이라도 포함되면 일단 통과 가정
const POLITE_HINTS = [
  "요",
  "ㅂ니다",
  "습니다",
  "세요",
  "어요",
  "예요",
  "이에요",
  "께요",
  "겠어요",
];

const SENTENCE_END_RE = /[.!?…]+/g;

/**
 * 텍스트가 반말 위주인지 대략 판정.
 *  - 문장 종결부의 정중어 비율이 30% 미만이면 반말로 판정.
 */
export function isLikelyPlainSpeech(text: string): boolean {
  const cleaned = text.replace(/```[\s\S]*?```/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return false;

  // 문장 단위 분리 — 간단히 . ! ? 기준
  const sentences = cleaned.split(SENTENCE_END_RE).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return false;

  let politeCount = 0;
  let plainCount = 0;

  for (const s of sentences) {
    // 마지막 ~12자 안에서 정중/반말 신호 검사
    const tail = s.slice(-12);
    const hasPolite = POLITE_HINTS.some((p) => tail.includes(p));
    if (hasPolite) {
      politeCount++;
      continue;
    }
    const hasPlain = PLAIN_ENDINGS.some((p) => tail.endsWith(p));
    if (hasPlain) plainCount++;
  }

  const total = politeCount + plainCount;
  if (total < 2) return false; // 너무 적은 표본은 판정 보류
  return politeCount / total < 0.3;
}

/**
 * 반말 의심 응답을 정중하게 다듬을 후처리 지시.
 * 호출처에서 OpenAI 재호출 시 추가 system 메시지로 사용.
 */
export const REPHRASE_TO_POLITE_INSTRUCTION =
  "방금 작성한 답을 의미를 그대로 유지한 채, 자연스러운 한국어 존댓말(~요/~예요/~습니다)로만 다시 써주세요. 반말 어미는 사용하지 마세요. 코드블록과 줄바꿈, 인용 형식은 그대로 보존하세요.";
