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
    <div className="w-full h-[min(62vh,520px)] max-md:h-[72vh] max-md:max-h-none bg-gs-surface-muted rounded-[14px] shadow-[inset_0_0_0_1px_var(--color-gs-line-soft)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gs-line-soft bg-gs-surface-muted text-xs text-gs-muted-soft flex justify-between items-center shrink-0">
        <span>{headerTitle}</span>
        {headerTag && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gs-blue-soft text-gs-blue-soft-fg">
            {headerTag}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 bg-gs-surface-mid">
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
                    ? "bg-gs-warning-bg text-gs-warning text-xs"
                    : "bg-white border border-gs-line-soft text-gs-text-strong"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="mb-2 flex flex-col items-start">
            <div className="bg-white border border-gs-line-soft text-gs-muted-soft px-3 py-2 rounded-[14px] text-[13px]">
              입력 중...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 z-10 border-t border-gs-line-soft bg-white flex p-2 gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 px-3 py-2 border border-gs-line-soft rounded-xl text-sm outline-none focus:border-gs-blue focus:ring-2 focus:ring-gs-blue/20 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-gs-navy-bright text-white rounded-xl text-[13px] font-bold cursor-pointer hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          전송
        </button>
      </div>
    </div>
  );
}
