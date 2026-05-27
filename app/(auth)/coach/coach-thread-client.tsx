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
import { renderWithSeparators } from "@/lib/coach/thread-render";
import { RealtimeStatusDot } from "@/components/realtime-status-dot";

interface Props {
  sessions: CoachSessionSummary[];
  initialMessages: CoachMessage[];
  activeSession: CoachSessionSummary | null;
  canStartNew: boolean;
}

export function CoachThreadClient({
  sessions: initialSessions,
  initialMessages,
  activeSession: initActive,
  canStartNew,
}: Props) {
  const [sessions, setSessions] = useState<CoachSessionSummary[]>(initialSessions);
  const [activeSession, setActiveSession] = useState<CoachSessionSummary | null>(initActive);
  const sessionIdsForRealtime = activeSession ? [activeSession.id] : [];
  const { messages, setMessages, status } = useCoachMessagesRealtime(
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

  const rendered = renderWithSeparators(sessions, messages);

  function handleStart() {
    startTransition(async () => {
      const r = await startCoachSession();
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      const newSession: CoachSessionSummary = {
        id: r.sessionId,
        status: "active",
        started_at: new Date().toISOString(),
        ended_at: null,
        coach_id: null,
        ended_by: null,
      };
      setSessions((prev) =>
        prev.find((s) => s.id === r.sessionId) ? prev : [...prev, newSession],
      );
      setActiveSession(newSession);
    });
  }

  function handleSend() {
    if (!activeSession || !input.trim()) return;
    const content = input.trim();
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimistic: CoachMessage = {
      id: tempId,
      sender_role: "user",
      content,
      created_at: new Date().toISOString(),
      session_id: activeSession.id,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    startTransition(async () => {
      const r = await sendCoachMessage(activeSession.id, content);
      if (!r.ok) {
        toast.show(r.error, "error");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInput(content);
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...r.message, session_id: activeSession.id } : m,
        ),
      );
    });
  }

  return (
    <Card className="mt-4 p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gs-line-soft bg-gs-surface-muted text-sm font-bold flex items-center justify-between">
        <span>{activeSession ? "코치와 대화 중" : "지난 대화"}</span>
        {activeSession && <RealtimeStatusDot status={status} />}
      </div>
      {activeSession && status === "disconnected" && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <span>실시간 연결이 끊어졌어요. 새 메시지가 안 보일 수 있어요.</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="font-bold underline"
          >
            새로고침
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="h-[480px] overflow-y-auto px-4 py-4 space-y-3"
      >
        {rendered.length === 0 ? (
          <div className="text-center text-gs-muted text-sm py-12">
            {activeSession
              ? "코치에게 첫 메시지를 보내보세요. 보통 평일 24시간 이내 답변드려요."
              : "아직 대화 기록이 없어요."}
          </div>
        ) : (
          rendered.map((item, idx) =>
            item.kind === "sep" ? (
              <div
                key={`sep-${item.sessionId}-${idx}`}
                className="text-center text-[11px] text-gs-muted py-2"
              >
                {item.label}
              </div>
            ) : (
              <div
                key={item.m.id}
                className={`flex ${item.m.sender_role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-[14px] text-sm whitespace-pre-wrap ${
                    item.m.sender_role === "user"
                      ? "bg-gs-blue text-white"
                      : "bg-gs-surface-muted border border-gs-line-soft"
                  }`}
                >
                  {item.m.content}
                  <div
                    className={`text-[10px] mt-1 ${item.m.sender_role === "user" ? "text-white/70" : "text-gs-muted"}`}
                  >
                    {new Date(item.m.created_at).toLocaleString("ko-KR", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ),
          )
        )}
      </div>

      {activeSession ? (
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
      ) : (
        <div className="border-t border-gs-line-soft p-3 flex justify-center">
          {canStartNew ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={pending}
              className="px-6 py-3 rounded-full bg-gs-gold text-gs-navy font-bold disabled:opacity-50"
            >
              {pending ? "준비 중..." : "코치와 새 대화 시작"}
            </button>
          ) : (
            <p className="text-sm text-gs-muted">
              이번 주 채팅 한도를 모두 사용했어요. 다음 주에 다시 시작할 수 있어요.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
