"use client";

import { useState } from "react";
import { ChatContainer, type ChatMessage } from "@/components/chat/chat-container";
import { sendChatMessage, summarizeAndSaveSession } from "@/lib/actions/chat";
import { useToast } from "@/components/ui/toast";

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
  const toast = useToast();

  async function handleSend(content: string) {
    const userMsg: ChatMessage = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const result = await sendChatMessage({ sessionId, content });
    setIsLoading(false);

    if (!result.ok) {
      toast.show(result.error, "error");
      return;
    }
    setSessionId(result.sessionId);
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
    <main className="max-w-[780px] mx-auto px-4 py-6">
      {/* 사용법 가이드 */}
      <section className="bg-white rounded-[18px] p-5 shadow-gs-card border border-[#e5e7eb] mb-4">
        <h2 className="text-[17px] font-bold mb-3">
          가짜생각 분석기 사용법
        </h2>
        <ul className="space-y-2.5">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="shrink-0 w-7 h-7 rounded-full bg-gs-blue-light text-gs-blue text-[14px] font-bold flex items-center justify-center">
                {step.badge}
              </span>
              <span
                className="text-[13.5px] leading-[1.6] text-[#374151]"
                dangerouslySetInnerHTML={{ __html: step.text }}
              />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] text-[#9ca3af]">
          * 처음엔 믿기지 않을 수도 있어요. 하지만 반복하면 새로운 생각에
          &apos;믿음의 힘&apos;이 생깁니다.
        </p>
      </section>

      {/* 채팅 */}
      <section className="bg-white rounded-[18px] p-4 shadow-gs-card border border-[#e5e7eb]">
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
          className="mt-3 w-full py-3 rounded-[14px] bg-gs-blue-light border border-[rgba(37,99,235,0.35)] text-gs-blue text-[14px] font-bold cursor-pointer hover:translate-y-[-1px] hover:shadow-gs-card transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSummarizing ? "분석 정리 중..." : "이 대화 정리하고 저장"}
        </button>
      </section>
    </main>
  );
}
