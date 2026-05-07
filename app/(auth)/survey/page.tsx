"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitSurvey } from "@/lib/actions/survey";
import { useToast } from "@/components/ui/toast";

// ─── 설문 데이터 정의 ───

const introQuestions = [
  {
    step: "Step 1",
    title: "어디에서 가짜생각을\n처음 보셨나요?",
    sub: "님이 우릴 어떻게 알았는지 궁금해요.",
    choices: ["인스타그램", "유튜브", "광고(배너/검색)", "네이버 카페/블로그", "지인 추천", "기타"],
    key: "channel",
  },
  {
    step: "Step 2",
    title: "어떤 프로그램에\n관심이 있으신가요?",
    sub: "복수 선택도 괜찮아요.",
    choices: ["우울 관리", "불안/긴장 관리", "자존감 향상", "수면 개선", "관계 스트레스", "잘 모르겠어요"],
    key: "program",
  },
  {
    step: "Step 3",
    title: "성별을 알려주세요.",
    sub: "맞춤형 콘텐츠를 위해 참고할게요.",
    choices: ["여성", "남성", "기타", "밝히고 싶지 않음"],
    key: "gender",
  },
  {
    step: "Step 4",
    title: "나이대를 알려주세요.",
    sub: "",
    choices: ["10대", "20대", "30대", "40대", "50대", "60대 이상"],
    key: "ageGroup",
  },
];

const depressionQuestions = [
  { q: "요즘 아침에 눈이 잘 떠지시나요?", choices: ["거의 매일 힘들어요", "절반은 버거워요", "가끔 힘들어요", "거의 괜찮아요"] },
  { q: "즐거움이나 흥미가 줄어든 느낌인가요?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
  { q: "식욕이 많이 변했나요?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
  { q: "잠들거나 유지가 힘든가요?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
  { q: "피곤하고 기운이 없나요?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
  { q: "나는 가치 없는 사람이라는 생각?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
  { q: "집중이 잘 안 되나요?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
  { q: "움직임이 느려지거나 안절부절?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
  { q: "차라리 없어지고 싶다는 생각?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
];

const anxietyQuestions = [
  { q: "긴장되거나 불안하거나 조마조마?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
  { q: "걱정을 멈출 수 없나요?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
  { q: "여러 가지를 동시에 걱정?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
  { q: "편히 쉬기 어려운가요?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
  { q: "안절부절 가만히 못 있나요?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
  { q: "쉽게 짜증이 나나요?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
  { q: "무서운 일이 생길 것 같은 느낌?", choices: ["거의 매일", "절반 이상", "가끔", "거의 없어요"] },
];

type Phase = "intro" | "depression" | "anxiety" | "result";

export default function SurveyPage() {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<Phase>("intro");
  const [introIndex, setIntroIndex] = useState(0);
  const [depIndex, setDepIndex] = useState(0);
  const [anxIndex, setAnxIndex] = useState(0);
  const [introAnswers, setIntroAnswers] = useState<Record<string, string>>({});
  const [depScores, setDepScores] = useState<number[]>([]);
  const [anxScores, setAnxScores] = useState<number[]>([]);

  const handleStart = (target: "/dashboard" | "/pricing") => {
    startTransition(async () => {
      const result = await submitSurvey({
        channel: introAnswers.channel ?? "",
        program: introAnswers.program ?? "",
        gender: introAnswers.gender ?? "",
        ageGroup: introAnswers.ageGroup ?? "",
        depressionAnswers: depScores,
        anxietyAnswers: anxScores,
      });
      if (!result.ok) {
        toast.show(result.error, "error");
        return;
      }
      toast.show("설문이 저장되었습니다", "success");
      router.push(target);
    });
  };

  // ─── 인트로 ───
  if (phase === "intro") {
    const q = introQuestions[introIndex];
    return (
      <SurveyShell step={q.step}>
        <h1 className="text-2xl font-bold leading-[1.4] mb-3 whitespace-pre-line">
          {q.title}
        </h1>
        {q.sub && <p className="text-base text-gs-text-soft mb-8 leading-[1.7]">{q.sub}</p>}
        <div className="flex flex-col gap-3">
          {q.choices.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setIntroAnswers((prev) => ({ ...prev, [q.key]: c }));
                if (introIndex < introQuestions.length - 1) {
                  setIntroIndex(introIndex + 1);
                } else {
                  setPhase("depression");
                }
              }}
              className="p-4 bg-white border border-gs-line-soft rounded-2xl text-base font-medium text-left cursor-pointer hover:border-gs-blue hover:bg-gs-blue-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40"
            >
              {c}
            </button>
          ))}
        </div>
      </SurveyShell>
    );
  }

  // ─── 우울 (PHQ-9) ───
  if (phase === "depression") {
    const q = depressionQuestions[depIndex];
    const progress = ((depIndex + 1) / depressionQuestions.length) * 100;
    return (
      <SurveyShell
        step={`마음 상태 점검 · 우울 · ${depIndex + 1} / ${depressionQuestions.length}`}
        progress={progress}
      >
        <h1 className="text-2xl font-bold text-center leading-[1.5] my-8">
          {q.q}
        </h1>
        <div className="flex flex-col gap-3">
          {q.choices.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                const score = 3 - i; // 첫 번째 = 3, 마지막 = 0
                setDepScores((prev) => [...prev, score]);
                if (depIndex < depressionQuestions.length - 1) {
                  setDepIndex(depIndex + 1);
                } else {
                  setPhase("anxiety");
                }
              }}
              className="p-4 bg-white border border-gs-line-soft rounded-2xl text-[15px] font-medium text-left cursor-pointer hover:border-gs-blue hover:bg-gs-blue-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40"
            >
              {c}
            </button>
          ))}
        </div>
        <p className="mt-8 text-[13px] text-gs-muted-light text-center leading-[1.6]">
          평가하려는 게 아니라, 지금 어디쯤에 있는지 살펴보는 과정이에요.
        </p>
      </SurveyShell>
    );
  }

  // ─── 불안 (GAD-7) ───
  if (phase === "anxiety") {
    const q = anxietyQuestions[anxIndex];
    const progress = ((anxIndex + 1) / anxietyQuestions.length) * 100;
    return (
      <SurveyShell
        step={`마음 상태 점검 · 불안 · ${anxIndex + 1} / ${anxietyQuestions.length}`}
        progress={progress}
      >
        <h1 className="text-2xl font-bold text-center leading-[1.5] my-8">
          {q.q}
        </h1>
        <div className="flex flex-col gap-3">
          {q.choices.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                const score = 3 - i;
                setAnxScores((prev) => [...prev, score]);
                if (anxIndex < anxietyQuestions.length - 1) {
                  setAnxIndex(anxIndex + 1);
                } else {
                  setPhase("result");
                }
              }}
              className="p-4 bg-white border border-gs-line-soft rounded-2xl text-[15px] font-medium text-left cursor-pointer hover:border-gs-blue hover:bg-gs-blue-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40"
            >
              {c}
            </button>
          ))}
        </div>
      </SurveyShell>
    );
  }

  // ─── 결과 ───
  const depRaw = depScores.reduce((a, b) => a + b, 0);
  const anxRaw = anxScores.reduce((a, b) => a + b, 0);
  const depPercent = Math.round((depRaw / 27) * 100);
  const anxPercent = Math.round((anxRaw / 21) * 100);

  return (
    <SurveyShell step="결과">
      <h1 className="text-2xl font-extrabold leading-[1.35] mb-6">
        마음 상태 점검 결과
      </h1>

      {/* 우울 */}
      <div className="bg-white border border-gs-line-soft rounded-[18px] p-5 mb-4 shadow-gs-card">
        <div className="text-xs font-bold text-gs-muted-soft mb-2">우울 부담 지표</div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black">{depPercent}</span>
          <span className="text-sm text-gs-text-soft">/ 100</span>
        </div>
        <div className="mt-4">
          <div className="w-full h-2 rounded-full bg-gs-line-soft overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#a5b4fc] to-gs-blue transition-all duration-300"
              style={{ width: `${depPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gs-muted-light mt-2">
            <span>낮음</span><span>중간</span><span>높음</span>
          </div>
        </div>
      </div>

      {/* 불안 */}
      <div className="bg-white border border-gs-line-soft rounded-[18px] p-5 mb-6 shadow-gs-card">
        <div className="text-xs font-bold text-gs-muted-soft mb-2">불안 부담 지표</div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black">{anxPercent}</span>
          <span className="text-sm text-gs-text-soft">/ 100</span>
        </div>
        <div className="mt-4">
          <div className="w-full h-2 rounded-full bg-gs-line-soft overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#fca5a5] to-[#ef4444] transition-all duration-300"
              style={{ width: `${anxPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gs-muted-light mt-2">
            <span>낮음</span><span>중간</span><span>높음</span>
          </div>
        </div>
      </div>

      {/* F23 — 추천 플랜 카드 (점수 기반) */}
      {(() => {
        // 추천 룰: 부담 합 100 이하 → 라이트, 100~140 → 프로, 140 초과 → 프리미엄
        const total = depPercent + anxPercent;
        const recommended =
          total > 140
            ? { key: "premium", label: "프리미엄", reason: "전담 상담사와 함께 깊이 있는 변화를" }
            : total > 100
              ? { key: "pro", label: "프로", reason: "행동연습장·명상·1:1 코칭으로 입체적 케어를" }
              : { key: "light", label: "라이트 AI", reason: "AI 분석과 기록으로 부드러운 시작을" };

        return (
          <div
            data-testid="recommended-plan"
            className="mb-6 p-5 rounded-[18px] bg-gs-blue text-white shadow-gs-card-hover"
          >
            <div className="text-[11px] font-bold opacity-80 mb-1">📌 당신에게 추천</div>
            <div className="text-xl font-black mb-1">{recommended.label} 플랜</div>
            <p className="text-sm opacity-90 leading-[1.6] mb-4">{recommended.reason}</p>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleStart("/pricing")}
              className="px-4 py-2 rounded-full bg-white text-gs-blue text-sm font-bold disabled:opacity-60"
            >
              플랜 자세히 보기 →
            </button>
          </div>
        );
      })()}

      <p className="text-sm text-gs-text-soft leading-[1.65] mb-6">
        이 결과는 <b>진단이 아니라</b> 지금의 마음 부담을 가늠해보는 참고값이에요.
        <br />
        프로그램이 시작되면 매주 변화를 추적할 수 있어요.
      </p>

      <button
        type="button"
        disabled={isPending}
        onClick={() => handleStart("/dashboard")}
        className="w-full py-4 rounded-[14px] bg-gs-blue text-white text-base font-bold cursor-pointer hover:bg-gs-blue-hover transition-colors disabled:opacity-60 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2"
      >
        {isPending ? "저장 중..." : "프로그램 시작하기"}
      </button>

      <button
        type="button"
        disabled={isPending}
        onClick={() => handleStart("/pricing")}
        className="w-full mt-2 py-3.5 rounded-[14px] border border-gs-line-mid bg-white text-gs-text-soft text-sm font-semibold cursor-pointer hover:bg-gs-surface-mid transition-colors disabled:opacity-60 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2"
      >
        요금제 먼저 보기
      </button>

      <p className="mt-4 text-xs text-gs-muted-light text-center leading-[1.6]">
        이 페이지는 결과 고정이 아니라, 시작점 확인용이에요.
      </p>
    </SurveyShell>
  );
}

// ─── 공통 쉘 ───
function SurveyShell({
  step,
  progress,
  children,
}: {
  step: string;
  progress?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gs-surface-muted">
      <div className="max-w-[520px] mx-auto px-5 pt-8 pb-16">
        <div className="mb-6">
          <div className="text-[13px] font-semibold text-gs-muted-soft mb-2">
            {step}
          </div>
          {progress !== undefined && (
            <div className="w-full h-1.5 rounded-full bg-gs-line-soft overflow-hidden">
              <div
                className="h-full rounded-full bg-gs-blue transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
