"use client";

import { useState } from "react";
import Image from "next/image";
import { ChatContainer, type ChatMessage } from "@/components/chat/chat-container";
import { Card } from "@/components/card";
import { sendChatMessage, summarizeAndSaveSession } from "@/lib/actions/chat";
import { useToast } from "@/components/ui/toast";
import { CrisisBanner } from "@/components/safety/crisis-banner";
import { detectCrisis } from "@/lib/cbt/crisis-detection";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerList, StaggerItem } from "@/components/motion/stagger-list";

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
    "안녕하세요! 가짜생각 분석기입니다.\n\n오늘 힘들었던 상황과 그때 떠오른 생각, 그리고 감정 점수(0~100)를 알려주세요.\n\n예) \"회의에서 발표할 때 다들 나를 무시하는 것 같았어요. 감정: 불안 80점\"",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showCrisisBanner, setShowCrisisBanner] = useState(false);
  const toast = useToast();

  async function handleSend(content: string) {
    const userMsg: ChatMessage = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);

    // 클라이언트 1차 감지 — 서버 왕복 전에 즉시 배너 표시
    if (detectCrisis(content).level === "warn") {
      setShowCrisisBanner(true);
    }

    setIsLoading(true);
    const result = await sendChatMessage({ sessionId, content });
    setIsLoading(false);

    if (!result.ok) {
      toast.show(result.error, "error");
      return;
    }
    setSessionId(result.sessionId);
    if (result.crisis) {
      setShowCrisisBanner(true);
      toast.show("긴급 상담이 필요하시면 1393에 전화해주세요", "error");
    }
    setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
  }

  async function handleSummarize() {
    if (!sessionId) {
      toast.show("아직 대화가 없어요", "error");
      return;
    }
    setIsSummarizing(true);
    const r = await summarizeAndSaveSession(sessionId);
    setIsSummarizing(false);
    if (!r.ok) {
      toast.show(r.error, "error");
      return;
    }
    toast.show("분석이 저장되었습니다. 성장방에서 확인하세요", "success");
    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        content: `📌 분석 정리 저장됨\n• 상황: ${r.situation}\n• 자동사고: ${r.automaticThought}\n• 대안사고: ${r.alternativeThought}${
          r.distortionTypes.length > 0 ? `\n• 인지왜곡: ${r.distortionTypes.join(", ")}` : ""
        }`,
      },
    ]);
  }

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
            <ChatContainer
              messages={messages}
              onSend={handleSend}
              isLoading={isLoading}
              placeholder="자동사고와 감정 점수를 적어주세요..."
              headerTitle="가짜생각 분석기"
              headerTag="인지왜곡 분석 · 대안사고"
            />
            <button
              type="button"
              onClick={handleSummarize}
              disabled={isSummarizing || !sessionId || messages.length < 3}
              className="mt-4 w-full py-3 rounded-toss-button bg-gs-navy-50 border border-gs-navy-bright/25 text-gs-navy-bright text-sm font-bold cursor-pointer hover:-translate-y-0.5 hover:shadow-toss-card transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSummarizing ? "분석 정리 중..." : "이 대화 정리하고 저장"}
            </button>
          </Card>
        </FadeIn>
      </main>
    </PageFade>
  );
}
