"use client";

import { useState, useRef, useEffect } from "react";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatContainerProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  headerTitle: string;
  headerTag?: string;
}

export function ChatContainer({
  messages,
  onSend,
  isLoading,
  placeholder = "메시지를 입력하세요...",
  headerTitle,
  headerTag,
}: ChatContainerProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  }

  return (
    <div className="w-full h-[min(62vh,520px)] max-[860px]:h-[72vh] max-[860px]:max-h-none bg-[#f9fafb] rounded-[14px] shadow-[inset_0_0_0_1px_#e5e7eb] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#e5e7eb] bg-[#f9fafb] text-[12px] text-[#6b7280] flex justify-between items-center shrink-0">
        <span>{headerTitle}</span>
        {headerTag && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#4338ca]">
            {headerTag}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2.5 bg-[#f3f4f6]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-2 flex flex-col ${
              msg.role === "user"
                ? "items-end"
                : msg.role === "system"
                  ? "items-center"
                  : "items-start"
            }`}
          >
            <div
              className={`max-w-[82%] px-3 py-2 rounded-[14px] whitespace-pre-wrap break-words text-[13px] leading-[1.6] ${
                msg.role === "user"
                  ? "bg-gs-navy-bright text-white"
                  : msg.role === "system"
                    ? "bg-[#fef3c7] text-[#92400e] text-[12px]"
                    : "bg-white border border-[#e5e7eb] text-[#111827]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="mb-2 flex flex-col items-start">
            <div className="bg-white border border-[#e5e7eb] text-[#6b7280] px-3 py-2 rounded-[14px] text-[13px]">
              입력 중...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 z-10 border-t border-[#e5e7eb] bg-white flex p-2 gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 px-3 py-2.5 border border-[#e5e7eb] rounded-xl text-[14px] outline-none focus:border-gs-blue disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2.5 bg-gs-navy-bright text-white rounded-xl text-[13px] font-bold cursor-pointer hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          전송
        </button>
      </div>
    </div>
  );
}
