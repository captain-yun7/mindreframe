"use client";

import { useState } from "react";
import type { Metadata } from "next";
import { HeroBanner } from "@/components/hero-banner";
import { ChatContainer, type ChatMessage } from "@/components/chat/chat-container";

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "안녕하세요. 오늘 있었던 일을 있는 그대로 쏟아내 주세요.\n힘들었던 상황, 떠오른 생각, 느낀 감정... 뭐든 괜찮아요.",
};

export default function TrashPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSend(content: string) {
    const userMsg: ChatMessage = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // TODO: API Route로 교체 (/api/trash)
    // 현재는 프로토타입용 더미 응답
    setTimeout(() => {
      const reply: ChatMessage = {
        role: "assistant",
        content:
          "그런 일이 있었군요. 충분히 힘들었을 거예요.\n\n그때 머릿속에 가장 먼저 떠오른 생각은 뭐였나요?",
      };
      setMessages((prev) => [...prev, reply]);
      setIsLoading(false);
    }, 800);
  }

  return (
    <div>
      <HeroBanner
        title="생각쓰레기통"
        subtitle="오늘 불안하거나, 우울하거나, 화가 났던 한 사건을 전부 쏟아놓으세요."
        note='생각쓰레기통이 알아서 <b>상황 · 생각 · 감정 · 신체반응 · 행동</b>을 나눠줄게요.'
      />

      <main className="max-w-[720px] mx-auto px-3 py-6">
        <div className="bg-white rounded-[18px] p-4 shadow-gs-card border border-[#e5e7eb]">
          <h2 className="text-[16px] font-semibold mb-1 text-[#111827]">
            왜 생각을 나눌까요?
          </h2>
          <p className="text-[13px] text-[#4b5563] mb-2.5 leading-[1.6]">
            1. 생각쓰레기통의 목적은 <b>생각을 없애는 것</b>이 아니라
            <b> 생각과 나를 분리하는 거</b>예요.
            <br /><br />
            2. 어떤 일이 생기면 <b>상황 · 생각 · 감정 · 신체반응 · 행동</b>이
            한 덩어리처럼 동시에 터져 나와요.
            <br /><br />
            3. 나누는 순간, <b>생각은 생각으로 나는 나로</b> 분리됩니다.
            <br /><br />
            *쓰면 쓸수록 뇌는 한 걸음 떨어져 바라봐요. 이것이{" "}
            <b>변화의 시작</b>이에요.
          </p>

          <ChatContainer
            messages={messages}
            onSend={handleSend}
            isLoading={isLoading}
            placeholder="그때 있었던 일을 있는 그대로 적어주세요..."
            headerTitle="생각쓰레기통"
            headerTag="상황 · 생각 · 감정 · 몸 · 행동"
          />

          <p className="mt-3 text-[12px] text-[#9ca3af] text-center">
            나중에 성장방에서 상황, 생각, 감정, 신체반응, 행동을 날짜별로 다시
            볼 수 있어요
          </p>
        </div>
      </main>
    </div>
  );
}
