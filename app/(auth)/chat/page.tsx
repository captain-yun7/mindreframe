"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChatContainer, type ChatMessage } from "@/components/chat/chat-container";
import { Card } from "@/components/card";
import {
  analyzeUserInput,
  startTherapy,
  continueTherapy,
  finalizeAndSave,
} from "@/lib/actions/chat";
import { useToast } from "@/components/ui/toast";
import { CrisisBanner } from "@/components/safety/crisis-banner";
import { detectCrisis } from "@/lib/cbt/crisis-detection";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerList, StaggerItem } from "@/components/motion/stagger-list";
import { DISTORTIONS, type AnalysisResult } from "@/lib/cbt/prompts";

type Phase = "analysis" | "selection" | "therapy" | "done";

const steps = [
  {
    badge: "①",
    text: '생각쓰레기통에서 찾은 생각을 쓰거나, 힘든 상황에서 떠오른 <b>자동사고</b>와 <b>감정점수(0~100)</b>를 적으세요.',
  },
  {
    badge: "②",
    text: "가짜생각 분석기가 <b>인지왜곡</b>을 찾아 질문하면 따라가 주세요.",
  },
  {
    badge: "③",
    text: "최대한 객관적으로 거리를 두고, <b>탐정이 된 듯</b> 질문에 답해봅니다.",
  },
  { badge: "④", text: "<b>합리적 사고</b>를 함께 찾아요!" },
  {
    badge: "⑤",
    text: "합리적 사고를 <b>외우고</b> 상황에 적용해요. <b>꼭이요!</b>",
  },
];

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "어떤 일이 있었는지, 그리고 어떤 생각이 들었는지 구체적으로 적어주세요. 그리고 감정을 0~100점으로 측정해주세요.\n\n예시: \"회의에서 발표를 해야 하는데, 떨려서 실수할 것 같고 사람들이 나를 이상하게 볼 것 같아요. 80점\"",
};

const PHASE_LABEL: Record<Phase, string> = {
  analysis: "1단계 · 분석",
  selection: "2단계 · 왜곡 선택",
  therapy: "3단계 · 합리적 사고 만들기",
  done: "정리 완료",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [phase, setPhase] = useState<Phase>("analysis");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCrisisBanner, setShowCrisisBanner] = useState(false);
  const awaitingEmotionAfterRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const saveLockRef = useRef(false);
  const toast = useToast();

  function appendAssistant(text: string) {
    setMessages((prev) => [...prev, { role: "assistant", content: text }]);
  }

  function appendSystem(text: string) {
    setMessages((prev) => [...prev, { role: "system", content: text }]);
  }

  async function runAnalysis(content: string) {
    setIsLoading(true);
    const result = await analyzeUserInput({ content });
    setIsLoading(false);
    if (!result.ok) {
      toast.show(result.error, "error");
      return;
    }
    if (result.crisis) {
      setShowCrisisBanner(true);
      setSessionId(result.sessionId);
      appendAssistant(result.reply);
      toast.show("긴급 상담이 필요하시면 1393에 전화해주세요", "error");
      return;
    }
    setSessionId(result.sessionId);
    setAnalysis(result.analysis);
    appendAssistant(result.summary);

    // 1.3초 딜레이 후 분기 — 원본 setTimeout(1300) 그대로
    await new Promise((r) => setTimeout(r, 1300));

    const distCount = result.analysis.distortions.length;
    if (distCount === 1) {
      await runStartTherapy(result.sessionId, result.analysis, result.analysis.distortions[0].name);
    } else if (distCount > 1) {
      setPhase("selection");
    } else {
      // distortions가 0개 — 분석이 인지왜곡을 찾지 못한 케이스. 사용자 재입력 유도.
      appendSystem(
        "분석에서 명확한 인지왜곡을 찾지 못했어요. 자동사고와 감정을 좀 더 구체적으로 적어주시면 다시 분석해볼게요.",
      );
      // phase는 analysis 유지 — 같은 세션 폐기, 다음 입력 받아 새 세션으로 진행
      setSessionId(null);
      setAnalysis(null);
    }
  }

  async function runStartTherapy(
    sid: string,
    analysisData: AnalysisResult,
    distortionName: string,
  ) {
    setIsLoading(true);
    const r = await startTherapy({
      sessionId: sid,
      analysis: analysisData,
      selectedDistortion: distortionName,
    });
    setIsLoading(false);
    if (!r.ok) {
      toast.show(r.error, "error");
      return;
    }
    appendAssistant(r.reply);
    setPhase("therapy");
  }

  async function runFinalize(sid: string, score: number) {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    try {
      const r = await finalizeAndSave({ sessionId: sid, emotionAfterScore: score });
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      const before = r.emotions?.before ?? "—";
      const after = r.emotions?.after ?? "—";
      appendSystem(
        `📌 분석 정리 저장됨\n• 감정점수: ${before} → ${after}\n${
          r.summary ? `\n${r.summary}` : ""
        }`,
      );
      appendAssistant(
        "오늘 정말 잘하셨어요. 이렇게 자기 생각을 들여다보는 것 자체가 쉽지 않은 일인데, 끝까지 해내셨어요. 마음속으로 합리적 사고를 새기세요. 할 수 있어요. 무조건 됩니다. 응원합니다.",
      );
      toast.show("성장방에 저장되었어요", "success");
      setPhase("done");
    } finally {
      saveLockRef.current = false;
    }
  }

  async function handleSend(content: string) {
    if (phase === "done") return;
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    if (detectCrisis(trimmed).level === "warn") {
      setShowCrisisBanner(true);
    }

    if (phase === "analysis") {
      await runAnalysis(trimmed);
      return;
    }

    if (phase === "selection") {
      // 사용자가 번호로 입력해도 받아주는 폴백 (원본 호환)
      const match = trimmed.match(/\d+/);
      if (match && analysis) {
        const idx = parseInt(match[0], 10) - 1;
        if (idx >= 0 && idx < analysis.distortions.length && sessionId) {
          await runStartTherapy(
            sessionId,
            analysis,
            analysis.distortions[idx].name,
          );
          return;
        }
      }
      appendSystem("아래 카드에서 왜곡을 골라주세요. 또는 번호를 입력해도 돼요.");
      return;
    }

    if (phase === "therapy" && sessionId) {
      // 감정점수(후) 응답 — 원본 sendMessage() line 1139~1146
      if (awaitingEmotionAfterRef.current) {
        const n = Number(trimmed);
        if (!Number.isNaN(n) && n >= 0 && n <= 100) {
          awaitingEmotionAfterRef.current = false;
          pendingSaveRef.current = true;
          (window as unknown as { __emotionAfterScore: number }).__emotionAfterScore = n;
        }
      }

      setIsLoading(true);
      const r = await continueTherapy({ sessionId, content: trimmed });
      setIsLoading(false);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      if (r.crisis) setShowCrisisBanner(true);
      appendAssistant(r.reply);

      if (r.awaitingEmotionAfter) {
        awaitingEmotionAfterRef.current = true;
      }

      // 예약된 자동 저장 실행 — 다음 assistant 응답 직후.
      // 위기 응답인 경우 자동 저장 보류 (안전 우선).
      if (pendingSaveRef.current && !r.crisis) {
        pendingSaveRef.current = false;
        const score =
          (window as unknown as { __emotionAfterScore?: number }).__emotionAfterScore ?? 0;
        await runFinalize(sessionId, score);
      }
    }
  }

  async function handlePickDistortion(name: string) {
    if (!sessionId || !analysis) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `"${name}" 왜곡을 다뤄볼게요` },
    ]);
    await runStartTherapy(sessionId, analysis, name);
  }

  async function handleManualFinalize() {
    if (!sessionId) {
      toast.show("아직 대화가 없어요", "error");
      return;
    }
    setIsLoading(true);
    await runFinalize(sessionId, 0);
    setIsLoading(false);
  }

  const placeholder =
    phase === "analysis"
      ? "자동사고와 감정 점수를 적어주세요..."
      : phase === "selection"
        ? "아래 카드를 골라주세요 (또는 번호 입력)"
        : phase === "done"
          ? "분석이 마무리되었어요"
          : "답을 적어주세요...";

  return (
    <PageFade>
      {/* ── HERO ── */}
      <section className="bg-gs-navy-50 py-12 md:py-16">
        <div className="mx-auto w-full max-w-[1120px] px-4">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <FadeIn delay={0} y={16}>
              <div className="text-sm font-bold tracking-[-0.01em] text-gs-navy-bright mb-3">
                CBT 인지왜곡 분석
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-gs-navy leading-[1.15]">
                당신의 생각을 한번
                <br />
                살펴봐요 💭
              </h1>
              <p className="mt-4 md:mt-5 text-base md:text-lg text-gs-muted-soft leading-relaxed">
                지금 떠오른 그 생각, 정말 사실일까요?
                <br className="hidden md:block" />
                11가지 인지왜곡 패턴을 함께 찾고{" "}
                <b className="text-gs-text-strong">합리적인 대안사고</b>를 만들어 드려요.
              </p>
            </FadeIn>

            <FadeIn delay={0.1} y={16} className="hidden lg:flex items-center justify-center">
              <Image
                src="/illustrations/chat-thinking.svg"
                alt=""
                width={260}
                height={260}
                className="w-[220px] xl:w-[260px] h-auto"
              />
            </FadeIn>
          </div>
        </div>
      </section>

      <main className="max-w-[780px] mx-auto px-4 pt-8 md:pt-10 pb-24">
        <CrisisBanner
          visible={showCrisisBanner}
          onDismiss={() => setShowCrisisBanner(false)}
        />

        {/* 사용법 가이드 */}
        <FadeIn>
          <Card className="mb-4 p-5 shadow-toss-card">
            <h2 className="text-base font-bold mb-3">가짜생각 분석기 사용법</h2>
            <ul className="space-y-3">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-gs-navy-50 text-gs-navy-bright text-sm font-bold flex items-center justify-center">
                    {step.badge}
                  </span>
                  <span
                    className="text-sm leading-[1.6] text-gs-text-soft"
                    dangerouslySetInnerHTML={{ __html: step.text }}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gs-muted-light">
              * 처음엔 믿기지 않을 수도 있어요. 하지만 반복하면 새로운 생각에
              &apos;믿음의 힘&apos;이 생깁니다.
            </p>
          </Card>
        </FadeIn>

        {/* 자주 발견되는 인지왜곡 */}
        <StaggerList stagger={0.08} className="mb-4 grid grid-cols-3 gap-2 max-sm:grid-cols-1">
          {[
            { tag: "흑백사고", desc: "전부 아니면 아예 안 돼" },
            { tag: "독심술", desc: "쟤가 분명히 나를 무시해" },
            { tag: "재앙화", desc: "분명히 최악이 일어날 거야" },
          ].map((d) => (
            <StaggerItem key={d.tag}>
              <div className="p-3 rounded-toss-card bg-white border border-gs-line-soft text-center shadow-toss-card">
                <div className="text-[12px] font-bold text-gs-navy-bright mb-1">
                  #{d.tag}
                </div>
                <div className="text-[11px] text-gs-muted">{d.desc}</div>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>

        {/* 채팅 */}
        <FadeIn>
          <Card className="shadow-toss-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-gs-navy-bright px-2 py-0.5 rounded-full bg-gs-navy-50">
                {PHASE_LABEL[phase]}
              </span>
              {phase === "therapy" && (
                <span className="text-[11px] text-gs-muted-light">
                  치료 대화 진행 중
                </span>
              )}
            </div>

            <ChatContainer
              messages={messages}
              onSend={handleSend}
              isLoading={isLoading}
              placeholder={placeholder}
              headerTitle="가짜생각 분석기"
              headerTag="인지왜곡 분석 · 대안사고"
            />

            {/* 인지왜곡 선택 카드 — selection phase */}
            {phase === "selection" && analysis && (
              <div className="mt-4 grid grid-cols-1 gap-2 max-sm:grid-cols-1">
                {analysis.distortions.map((d, i) => {
                  const info = DISTORTIONS[d.name];
                  return (
                    <button
                      key={`${d.name}-${i}`}
                      type="button"
                      onClick={() => handlePickDistortion(d.name)}
                      disabled={isLoading}
                      className="text-left p-4 rounded-toss-card border border-gs-line-soft bg-white hover:border-gs-navy-bright hover:-translate-y-0.5 hover:shadow-toss-card-hover transition-all shadow-toss-card disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 w-7 h-7 rounded-full bg-gs-navy-50 text-gs-navy-bright text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-gs-text-strong mb-1">
                            #{d.name}
                          </div>
                          <p className="text-[12.5px] text-gs-muted leading-[1.6]">
                            {d.description}
                          </p>
                          {info?.goal && (
                            <p className="mt-2 text-[11.5px] text-gs-navy-bright font-bold">
                              목표 · {info.goal}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 백업: 수동 종료 버튼 — therapy 진행 중일 때만 */}
            {phase === "therapy" && (
              <button
                type="button"
                onClick={handleManualFinalize}
                disabled={isLoading || !sessionId}
                className="mt-4 w-full py-3 rounded-toss-button bg-gs-navy-50 border border-gs-navy-bright/25 text-gs-navy-bright text-sm font-bold cursor-pointer hover:-translate-y-0.5 hover:shadow-toss-card transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "분석 정리 중..." : "이 대화 정리하고 저장"}
              </button>
            )}
          </Card>
        </FadeIn>
      </main>
    </PageFade>
  );
}
