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

/**
 * 가짜생각 분석기 / 생각쓰레기통 공통 채팅 UI.
 *
 * 카톡식 UX:
 *   - 메시지는 컨테이너 하단에 정렬(콘텐츠 적을 때 빈 위쪽 공간) → `justify-end + min-h-full`
 *   - 새 메시지/스트리밍/typing dots 등장 시 항상 하단으로 자동 스크롤
 *   - 입력창은 textarea로 자동 확장(1~5줄), Enter=전송 / Shift+Enter=줄바꿈
 *   - IME(한글 조합) 중 Enter 무시 — 입력 도중 잘못 전송 방지
 */
export function ChatContainer({
  messages,
  onSend,
  isLoading,
  placeholder = "메시지를 입력하세요...",
  headerTitle,
  headerTag,
}: ChatContainerProps) {
  const [input, setInput] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 스트리밍 등 마지막 메시지 content가 누적되는 케이스도 잡기 위해 deps에 포함
  const lastContent = messages[messages.length - 1]?.content ?? "";

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    // DOM 업데이트 직후 스크롤 보장
    const id = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [messages.length, lastContent, isLoading]);

  // textarea 자동 확장 (1~5줄)
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const max = 120; // ≈ 5줄
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
  }, [input]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
    requestAnimationFrame(() => {
      if (inputRef.current) inputRef.current.style.height = "auto";
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // 한글 IME 조합 중에는 Enter 무시. Shift+Enter는 줄바꿈 유지.
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing
    ) {
      e.preventDefault();
      handleSend();
    }
  }

  // F128/F133: iOS Safari 키보드 노출 시 입력창 보호. block을 nearest로 두어 페이지 점프 최소화.
  function handleInputFocus() {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 300);
  }

  return (
    <div className="w-full h-[min(62dvh,520px)] max-md:h-[72dvh] max-md:max-h-none bg-gs-surface-muted rounded-[14px] shadow-[inset_0_0_0_1px_var(--color-gs-line-soft)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gs-line-soft bg-gs-surface-muted text-xs text-gs-muted-soft flex justify-between items-center shrink-0">
        <span>{headerTitle}</span>
        {headerTag && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gs-blue-soft text-gs-blue-soft-fg">
            {headerTag}
          </span>
        )}
      </div>

      {/* Messages — 카톡식 하단 정렬 */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-gs-surface-mid"
      >
        <div className="flex flex-col justify-end min-h-full p-3">
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
              <div className="bg-white border border-gs-line-soft px-3 py-2 rounded-[14px]">
                <TypingDots />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input — textarea 자동 확장 + IME-safe Enter */}
      <div className="sticky bottom-0 z-10 border-t border-gs-line-soft bg-white flex p-2 gap-2 items-end shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <textarea
          ref={inputRef}
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 min-w-0 px-3 py-2 border border-gs-line-soft rounded-xl text-base md:text-sm outline-none focus:border-gs-blue focus:ring-2 focus:ring-gs-blue/20 disabled:opacity-50 resize-none leading-6 max-h-[120px]"
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

function TypingDots() {
  return (
    <span
      className="inline-flex gap-1 items-center h-[1.2em]"
      aria-label="입력 중"
      role="status"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-gs-muted-soft/70 animate-bounce [animation-delay:-0.32s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-gs-muted-soft/70 animate-bounce [animation-delay:-0.16s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-gs-muted-soft/70 animate-bounce" />
    </span>
  );
}
