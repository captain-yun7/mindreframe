/**
 * 행동연습장 페이로드 — 원본 worksheets.html의 ws_logs 배열 한 항목과 동일 구조.
 * exercise_logs.note(text) 컬럼에 JSON 직렬화로 저장.
 *
 * mode:
 *   - "anxiety" : 불안 줄이기 (원본 anxiety_exposure)
 *   - "depress" : 우울 벗어나기 (원본 depress_activity)
 *
 * 레거시 페이로드(2026-05 sprint F6의 plan/execution/reflection)는 parseExerciseNote 에서 그대로 통과.
 */

export type ExerciseMode = "anxiety" | "depress";

// ─── 2단계 계획 한 행 ───
export interface AnxietyPlanItem {
  situation: string;
  expected: string;
  rank: string;
  auto: string;
  rational: string;
}

export interface DepressPlanItem {
  activity: string;
  diff: string;
  memo?: string;
}

// ─── 4단계 도전/활동 기록 (DB 저장 단위 — exercise_logs row 1건) ───
export interface AnxietyExerciseLog {
  type: "anxiety_exposure";
  mode: "anxiety";
  situation: string;
  expectedAnxiety: number | null;
  avoidRank: number | null;
  autoThought: string;
  rationalThought: string;
  did: "did" | "no";
  actualBefore: number | null;
  actualAfter: number | null;
  learnedLine: string;
  unexpectedThought?: string;
}

export interface DepressExerciseLog {
  type: "depress_activity";
  mode: "depress";
  activity: string;
  diff: number | null;
  did: "did" | "no";
  actualAfter: number | null;
  learnedLine: string;
  unexpectedThought?: string;
}

export type ExerciseLogPayload = AnxietyExerciseLog | DepressExerciseLog;

// ─── 레거시(2026-05) 페이로드 ───
export interface LegacyExercisePayload {
  plan: { what: string; when?: string; whereWho?: string };
  execution?: { did: boolean; before?: number; after?: number };
  reflection?: string;
}

/** note(JSON)을 안전하게 파싱. 실패 시 plain text로 반환. */
export type ParsedExerciseNote =
  | (ExerciseLogPayload & { __legacy?: false })
  | (LegacyExercisePayload & { __legacy: true })
  | { plain: string };

export function parseExerciseNote(
  note: string | null | undefined,
): ParsedExerciseNote {
  if (!note) return { plain: "" };
  try {
    const parsed = JSON.parse(note);
    if (parsed && typeof parsed === "object") {
      if (parsed.type === "anxiety_exposure" || parsed.type === "depress_activity") {
        return parsed as ExerciseLogPayload;
      }
      if ("plan" in parsed) {
        return { ...(parsed as LegacyExercisePayload), __legacy: true };
      }
    }
    return { plain: note };
  } catch {
    return { plain: note };
  }
}

// ─── 30개 예시 (원본 worksheets.html L1800~1852) ───
export interface ExerciseExampleGroup {
  title: string;
  items: string[];
}

export const ANXIETY_EXAMPLES: ExerciseExampleGroup[] = [
  {
    title: "사람들 앞에서 긴장되는 상황",
    items: [
      "회의에서 말하기",
      "발표하기(수업/회사 보고)",
      "질문해야 하는데 망설이기",
      "처음 보는 사람과 인사하기",
      "상사/선생님에게 의견 말하기",
      "모르는 번호 전화 받기",
      "식당에서 주문하기",
      "사진 찍힐 때",
      "모임에서 자기소개하기",
      "친한 친구와 단둘이 있을 때 어색함",
    ],
  },
  {
    title: "특정한 것들이 유난히 무서울 때",
    items: [
      "높은 곳(계단/육교/베란다)",
      "엘리베이터 타기",
      "지하철/버스 타기",
      "어두운 길 걷기",
      "터널/지하주차장",
      "개가 있는 길 지나가기",
      "주사/병원 가기",
      "피/상처 보기",
      "물(수영장/바다)",
      "좁은 공간(밀폐된 곳)",
    ],
  },
  {
    title: "몸 반응이 갑자기 무서울 때",
    items: [
      "가슴 두근거림이 무서울 때",
      "숨이 가빠질까 봐 불안",
      "어지럼/현기증 날까 봐 겁남",
      "운전 중 갑자기 불안",
      "혼자 외출하기",
      "멀리 이동(장거리)",
      "사람 많은 곳(마트/지하철)",
      "대기 줄 서기",
      "불안 올까 봐 미리 회피",
      "집 밖으로 나가기 자체가 불안",
    ],
  },
];

export const DEPRESS_EXAMPLES: ExerciseExampleGroup[] = [
  {
    title: "아주 쉬운 시작(3~10분)",
    items: [
      "창문 열고 환기 3분",
      "물 한 컵 마시기",
      "세수/양치만 하기",
      "침대 정리(이불 펴기)",
      "집 앞까지 나갔다 오기",
      "따뜻한 차/커피 한 잔",
      "음악 1곡 듣기",
      "가벼운 스트레칭 3분",
      "햇빛 받기(창가/베란다)",
      "쓰레기만 버리기",
    ],
  },
  {
    title: "기분 깨우기(가벼운 활력)",
    items: [
      "10분 산책",
      "방 1구역 정리",
      "샤워하기",
      "간단한 요리/과일 깎기",
      "빨래 돌리기(시작만)",
      "짧은 독서 5쪽",
      "일기 5줄 쓰기",
      "가벼운 청소(책상 위)",
      "가까운 사람에게 안부 문자",
      "스트레칭 + 물 마시기",
    ],
  },
  {
    title: "의미/관계(작게 연결)",
    items: [
      "짧은 감사 메시지 보내기",
      "공원 벤치 10분",
      "따뜻한 목욕/족욕",
      "좋아하던 영상 1개 보기",
      "간단한 장보기(1~3개)",
      "미뤄둔 전화 1통",
      "내일 할 일 1개만 적기",
      "가까운 카페에 잠깐 앉기",
      "고마웠던 사람 1명 떠올리기",
      "요리 재료만 사오기",
    ],
  },
];

// ─── 10행 빈 행 빌더 ───
export function buildAnxRows(): AnxietyPlanItem[] {
  return Array.from({ length: 10 }, () => ({
    situation: "",
    expected: "",
    rank: "",
    auto: "",
    rational: "",
  }));
}

export function buildDepRows(): DepressPlanItem[] {
  return Array.from({ length: 10 }, () => ({
    activity: "",
    diff: "",
    memo: "",
  }));
}
