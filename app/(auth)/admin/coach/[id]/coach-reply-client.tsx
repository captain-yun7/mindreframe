"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Card } from "@/components/card";
import { useToast } from "@/components/ui/toast";
import {
  type CoachMessage,
  endCoachSession,
  getCoachMessages,
  sendCoachReply,
} from "@/lib/actions/coach-chat";

interface Props {
  sessionId: string;
  initialMessages: CoachMessage[];
  sessionStatus: "active" | "ended";
}

export function CoachReplyClient({
  sessionId,
  initialMessages,
  sessionStatus: initialStatus,
}: Props) {
  const [messages, setMessages] = useState<CoachMessage[]>(initialMessages);
  const [status, setStatus] = useState(initialStatus);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "active") return;
    const timer = setInterval(async () => {
      const r = await getCoachMessages(sessionId);
      if (r.ok) setMessages(r.messages);
    }, 10_000);
    return () => clearInterval(timer);
  }, [sessionId, status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function handleSend() {
    if (!input.trim()) return;
    const content = input.trim();
    setInput("");
    startTransition(async () => {
      const r = await sendCoachReply(sessionId, content);
      if (!r.ok) {
        toast.show(r.error, "error");
        setInput(content);
        return;
      }
      const fresh = await getCoachMessages(sessionId);
      if (fresh.ok) setMessages(fresh.messages);
    });
  }

  function handleEnd() {
    if (!confirm("이 대화를 종료할까요?")) return;
    startTransition(async () => {
      const r = await endCoachSession(sessionId);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      setStatus("ended");
      toast.show("대화를 종료했어요", "success");
    });
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gs-line-soft flex justify-between items-center bg-gs-surface-muted">
        <div className="text-sm font-bold">
          {status === "active" ? "대화 진행 중" : "대화 종료됨"}
        </div>
        {status === "active" && (
          <button
            type="button"
            onClick={handleEnd}
            disabled={pending}
            className="text-xs text-gs-muted hover:text-gs-text"
          >
            대화 종료
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="h-[480px] overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gs-muted text-sm py-12">
            아직 메시지가 없어요.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender_role === "coach" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-[14px] text-sm whitespace-pre-wrap ${
                  m.sender_role === "coach"
                    ? "bg-gs-blue text-white"
                    : "bg-gs-surface-muted border border-gs-line-soft"
                }`}
              >
                {m.content}
                <div
                  className={`text-[10px] mt-1 ${m.sender_role === "coach" ? "text-white/70" : "text-gs-muted"}`}
                >
                  {m.sender_role === "user" ? "사용자 · " : "상담사 · "}
                  {new Date(m.created_at).toLocaleString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {status === "active" && (
        <div className="border-t border-gs-line-soft p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="답변을 입력하세요..."
            disabled={pending}
            className="flex-1 px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm focus:outline-none focus:ring-2 focus:ring-gs-blue/40"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={pending || !input.trim()}
            className="px-4 py-2 rounded-[10px] bg-gs-blue text-white text-sm font-bold disabled:opacity-50"
          >
            답변 전송
          </button>
        </div>
      )}
    </Card>
  );
}
