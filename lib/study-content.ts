/**
 * 알고가기 콘텐츠 — 글자(무료) + 영상(유료) placeholder.
 * 실제 본문은 고객사 100일 학습 원고 수령 후 채움. 현재는 구조만.
 */

export interface StudyArticle {
  slug: string;
  category: "essential" | "concept" | "thought" | "fake" | "change";
  title: string;
  desc: string;
  body: string; // markdown-ish 본문 (무료)
  videoUrl: string | null; // 유료 영상 (수령 전이면 null)
}

export const STUDY_ARTICLES: StudyArticle[] = [
  {
    slug: "100days",
    category: "essential",
    title: "기적의 100일 프로그램",
    desc: "100일간의 생각 훈련 전체 로드맵",
    body: `
가짜생각 100일 프로그램은 인지행동치료(CBT) 기반의 생각 훈련 코스입니다.

매일 5분, 100일 동안 다음 5가지를 반복합니다:

1. **감정 점수 체크** — 0(괜찮음) ~ 100(매우 힘듦)
2. **생각쓰레기통** — 한 사건을 상황·생각·감정·신체·행동으로 분리
3. **가짜생각 분석기** — 자동사고에서 인지왜곡을 찾아 대안사고로 전환
4. **3분 집중 명상** — 호흡/소리/한 문장에 주의 옮기기
5. **감사일기** — 한 줄이라도 좋으니 적기

100일이 지나면 뇌의 자동 반응 패턴이 바뀝니다. 변화의 시작은 오늘이에요.
    `.trim(),
    videoUrl: null,
  },
  {
    slug: "emotion",
    category: "concept",
    title: "감정의 정체",
    desc: "감정은 신호이지, 나 자체가 아닙니다",
    body: `
감정은 우리에게 신호를 보내는 알람입니다. "지금 위험해", "지금 외로워", "지금 화나"라고요.

문제는 우리가 감정을 **나 자체**라고 착각하는 것입니다. "나는 슬픈 사람이야" 대신 "지금 슬픔이라는 감정이 일어났구나"로 표현해보세요.

감정과 나를 분리하면, 감정은 지나가는 손님처럼 다룰 수 있게 됩니다.
    `.trim(),
    videoUrl: null,
  },
  {
    slug: "thought",
    category: "thought",
    title: "자동사고란?",
    desc: "머릿속에 자동으로 떠오르는 생각의 비밀",
    body: `
자동사고(Automatic Thought)는 어떤 상황에서 **의식하지 않아도 즉시 떠오르는 생각**입니다.

예) 발표 중 누군가 하품 → "내 발표가 지루한가?" → 불안

자동사고는 빠르고, 그래서 **검증되지 않은 채로** 감정과 행동에 영향을 줍니다.
가짜생각 분석기는 이 자동사고를 의식 위로 끌어올려 검증하는 도구입니다.
    `.trim(),
    videoUrl: null,
  },
  {
    slug: "fake-thought",
    category: "fake",
    title: "가짜생각(인지왜곡) 16가지",
    desc: "당신의 뇌가 만들어내는 16가지 사고 오류",
    body: `
인지왜곡은 우리 뇌가 빠르게 판단하기 위해 사실을 비틀어 받아들이는 패턴입니다. 대표 16가지:

1. **흑백사고** — "전부 아니면 아예 안 돼"
2. **파국화** — "분명히 최악의 일이 일어날 거야"
3. **독심술** — "쟤가 분명히 나를 무시해"
4. **점쟁이 오류** — "나는 절대 안 될 거야"
5. **과잉일반화** — "한 번 실패했으니 다 실패할 거야"
6. **마음의 필터** — 부정적인 한 가지에만 집중
7. **긍정 무시** — 잘된 것은 운, 잘못된 것은 내 탓
8. **감정적 추론** — "기분이 그래, 그러니까 그게 사실이야"
9. **의무진술** — "반드시 ~해야 해"
10. **명명** — 자신을 한 단어로 정의 ("나는 패배자")
... 등.

가짜생각 분석기에서 어떤 왜곡인지 식별 → 검증 → 대안사고로 전환합니다.
    `.trim(),
    videoUrl: null,
  },
  {
    slug: "change",
    category: "change",
    title: "생각이 바뀌면 감정이 바뀐다",
    desc: "CBT의 핵심 원리를 이해하기",
    body: `
CBT(인지행동치료)의 핵심 명제: **상황은 그대로지만, 생각이 바뀌면 감정과 행동이 바뀐다.**

같은 비를 보고도 누군가는 "우울하다", 누군가는 "운치있다"고 느낍니다. 차이는 비가 아니라 **그 비를 해석하는 생각**에 있습니다.

100일 동안 생각의 패턴을 관찰·검증·교체하면, 같은 상황에서 다른 감정이 일어납니다.
    `.trim(),
    videoUrl: null,
  },
  {
    slug: "core-belief",
    category: "change",
    title: "핵심신념이란?",
    desc: "자동사고 아래에 숨어있는 뿌리 깊은 믿음",
    body: `
자동사고 아래에는 더 깊은 **핵심신념**이 있습니다. 예) "나는 사랑받을 자격이 없어", "세상은 안전하지 않아".

핵심신념은 어린 시절 형성되어 평생 작동합니다. 매번 자동사고를 만들어내는 **공장**입니다.

자동사고를 100번 검증하다 보면, 그 아래에 있는 핵심신념의 윤곽이 보입니다. 핵심신념이 흔들리면, 자동사고도 자연히 줄어듭니다.
    `.trim(),
    videoUrl: null,
  },
];

export function getStudyArticle(slug: string): StudyArticle | null {
  return STUDY_ARTICLES.find((a) => a.slug === slug) ?? null;
}

export function listStudyArticles() {
  return STUDY_ARTICLES.map(({ slug, category, title, desc }) => ({
    slug,
    category,
    title,
    desc,
  }));
}
