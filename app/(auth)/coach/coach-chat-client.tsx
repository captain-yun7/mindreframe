"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Card } from "@/components/card";
import { useToast } from "@/components/ui/toast";
import {
  type CoachMessage,
  type CoachSessionSummary,
  startCoachSession,
  sendCoachMessage,
} from "@/lib/actions/coach-chat";
import { useCoachMessagesRealtime } from "@/lib/hooks/use-coach-messages-realtime";

interface Props {
  activeSession?: CoachSessionSummary;
  initialMessages: CoachMessage[];
  canStartNew: boolean;
  pastSessions: CoachSessionSummary[];
}

export function CoachChatClient({
  activeSession,
  initialMessages,
  canStartNew,
  pastSessions,
}: Props) {
  const [session, setSession] = useState<CoachSessionSummary | undefined>(activeSession);
  const sessionIdsForRealtime = session && session.status === "active" ? [session.id] : [];
  const { messages, setMessages } = useCoachMessagesRealtime(
    initialMessages,
    sessionIdsForRealtime,
  );
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function handleStart() {
    startTransition(async () => {
      const r = await startCoachSession();
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      setSession({
        id: r.sessionId,
        status: "active",
        started_at: new Date().toISOString(),
        ended_at: null,
        coach_id: null,
        ended_by: null,
      });
      setMessages([]);
    });
  }

  function handleSend() {
    if (!session || !input.trim()) return;
    const content = input.trim();
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimistic: CoachMessage = {
      id: tempId,
      sender_role: "user",
      content,
      created_at: new Date().toISOString(),
      session_id: session.id,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    startTransition(async () => {
      const r = await sendCoachMessage(session.id, content);
      if (!r.ok) {
        toast.show(r.error, "error");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInput(content);
        return;
      }
      // 서버 응답으로 즉시 tempId → 실 row 치환 (Realtime echo는 dedup에서 skip)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...r.message, session_id: session.id } : m,
        ),
      );
    });
  }

  if (!session) {
    return (
      <>
        <Card className="mt-4 p-6 text-center">
          {canStartNew ? (
            <>
              <p className="text-sm text-gs-text-soft mb-4">
                지금 새 대화를 시작할 수 있어요.
              </p>
              <button
                type="button"
                onClick={handleStart}
                disabled={pending}
                className="px-6 py-3 rounded-full bg-gs-gold text-gs-navy font-bold disabled:opacity-50"
              >
                {pending ? "준비 중..." : "코치와 새 대화 시작"}
              </button>
            </>
          ) : (
            <p className="text-sm text-gs-muted">
              이번 주 채팅 한도를 모두 사용했어요. 다음 주에 다시 시작할 수 있어요.
            </p>
          )}
        </Card>

        {pastSessions.length > 0 && (
          <Card className="mt-4 p-4">
            <h3 className="text-sm font-bold mb-2">지난 대화</h3>
            <ul className="space-y-1 text-xs text-gs-muted">
              {pastSessions.map((s) => (
                <li key={s.id}>
                  {new Date(s.started_at).toLocaleString("ko-KR")}
                  {s.ended_at &&
                    ` ~ ${new Date(s.ended_at).toLocaleString("ko-KR")}`}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </>
    );
  }

  return (
    <Card className="mt-4 p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gs-line-soft bg-gs-surface-muted">
        <div className="text-sm font-bold">상담사와 대화 중</div>
      </div>

      <div
        ref={scrollRef}
        className="h-[480px] overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gs-muted text-sm py-12">
            상담사에게 첫 메시지를 보내보세요. 보통 평일 24시간 이내 답변드려요.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender_role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-[14px] text-sm whitespace-pre-wrap ${
                  m.sender_role === "user"
                    ? "bg-gs-blue text-white"
                    : "bg-gs-surface-muted border border-gs-line-soft"
                }`}
              >
                {m.content}
                <div
                  className={`text-[10px] mt-1 ${m.sender_role === "user" ? "text-white/70" : "text-gs-muted"}`}
                >
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
          placeholder="메시지를 입력하세요..."
          disabled={pending}
          className="flex-1 px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm focus:outline-none focus:ring-2 focus:ring-gs-blue/40"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={pending || !input.trim()}
          className="px-4 py-2 rounded-[10px] bg-gs-blue text-white text-sm font-bold disabled:opacity-50"
        >
          전송
        </button>
      </div>
    </Card>
  );
}
