/**
 * 자해/자살 위기 감지 (키워드 기반)
 *
 * 명세 출처: work-plan.md M3 안전장치, audit P1-A
 * 정책: 사용자 입력에 위기 키워드가 발견되면 AI 호출 전에 1393/109 안내를 1차로 노출.
 *       OpenAI 응답에서도 동일 키워드가 발견되면 안내 카드를 자동 추가한다.
 *
 * NOTE: 키워드 매칭은 실패-안전(false negative 허용 X) 우선 — 의심되면 트리거.
 *       법적·윤리 리스크 항목이라 임계 낮게 잡는다. 재정리는 가능하지만 빼기 금지.
 */

const CRISIS_KEYWORDS: string[] = [
  // 직접 표현
  "자살",
  "자해",
  "죽고싶",
  "죽고 싶",
  "죽어버리",
  "죽어 버리",
  "사라지고싶",
  "사라지고 싶",
  "없어지고싶",
  "없어지고 싶",
  // 행동 묘사
  "목매",
  "목 매",
  "목을 매",
  "목 매달",
  "목매달",
  "투신",
  "뛰어내리",
  "뛰어 내리",
  "약을 먹고",
  "약 먹고 죽",
  "수면제",
  "번개탄",
  "유서",
  "마지막 인사",
  "이 세상에서 사라",
  // 자해 관련
  "칼로 그",
  "면도날",
  "긋고 싶",
  "그어버리",
  "긋고싶",
  "베고 싶",
  "베고싶",
  // 무망감/계획
  "더 이상 못 살",
  "더이상 못살",
  "살 가치가 없",
  "살 이유가 없",
  "내가 죽으면",
  "끝내고 싶",
  "끝내고싶",
  "삶을 끝",
  "다 끝내",
  // 영문 (혹시 모를 케이스)
  "suicide",
  "kill myself",
  "end my life",
  "self harm",
  "self-harm",
];

export type CrisisLevel = "none" | "warn";

export interface CrisisDetectionResult {
  level: CrisisLevel;
  matched: string[];
}

export function detectCrisis(text: string): CrisisDetectionResult {
  if (!text) return { level: "none", matched: [] };
  const normalized = text.toLowerCase();
  const matched: string[] = [];
  for (const kw of CRISIS_KEYWORDS) {
    if (normalized.includes(kw.toLowerCase())) {
      matched.push(kw);
    }
  }
  return { level: matched.length > 0 ? "warn" : "none", matched };
}

export const CRISIS_GUIDE_MESSAGE = `지금 많이 힘드시죠. 혼자 견디지 마세요.

전문 상담사와 바로 통화하실 수 있어요.
• 자살예방상담전화 1393 (24시간, 무료)
• 정신건강상담전화 1577-0199
• 청소년전화 1388
• 응급상황: 112 / 119

가까운 분께 지금 이 마음을 한마디만 전해주세요. 당신의 안전이 가장 중요합니다.`;
