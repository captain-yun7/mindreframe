"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Card } from "@/components/card";
import { useToast } from "@/components/ui/toast";
import {
  type CoachMessage,
  type CoachSessionSummary,
  endCoachSession,
  sendCoachReply,
} from "@/lib/actions/coach-chat";
import { useCoachMessagesRealtime } from "@/lib/hooks/use-coach-messages-realtime";
import { renderWithSeparators } from "@/lib/coach/thread-render";
import { RealtimeStatusDot } from "@/components/realtime-status-dot";

interface Props {
  sessionId: string;
  sessions: CoachSessionSummary[];
  initialMessages: CoachMessage[];
  activeSession: CoachSessionSummary | null;
}

export function CoachReplyClient({
  sessionId,
  sessions,
  initialMessages,
  activeSession: initActive,
}: Props) {
  const [activeSession, setActiveSession] =
    useState<CoachSessionSummary | null>(initActive);
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

  // 진입한 [id]가 현재 활성 세션인 경우에만 종료 버튼 + 입력창 노출
  const canEnd = activeSession?.id === sessionId;
  const targetSessionId = activeSession?.id ?? sessionId;

  const rendered = renderWithSeparators(sessions, messages);

  function handleSend() {
    if (!input.trim() || !activeSession) return;
    const content = input.trim();
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimistic: CoachMessage = {
      id: tempId,
      sender_role: "coach",
      content,
      created_at: new Date().toISOString(),
      session_id: activeSession.id,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    startTransition(async () => {
      const r = await sendCoachReply(activeSession.id, content);
      if (!r.ok) {
        toast.show(r.error, "error");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInput(content);
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...r.message, session_id: activeSession.id }
            : m,
        ),
      );
    });
  }

  function handleEnd() {
    if (!confirm("이 대화를 종료할까요?")) return;
    startTransition(async () => {
      const r = await endCoachSession(targetSessionId);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      setActiveSession(null);
      toast.show("대화를 종료했어요", "success");
    });
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gs-line-soft flex justify-between items-center bg-gs-surface-muted">
        <div className="text-sm font-bold flex items-center gap-2">
          <span>{activeSession ? "대화 진행 중" : "대화 기록"}</span>
          {activeSession && <RealtimeStatusDot status={status} />}
        </div>
        {canEnd && (
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
            아직 메시지가 없어요.
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
                className={`flex ${item.m.sender_role === "coach" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-[14px] text-sm whitespace-pre-wrap ${
                    item.m.sender_role === "coach"
                      ? "bg-gs-blue text-white"
                      : "bg-gs-surface-muted border border-gs-line-soft"
                  }`}
                >
                  {item.m.content}
                  <div
                    className={`text-[10px] mt-1 ${item.m.sender_role === "coach" ? "text-white/70" : "text-gs-muted"}`}
                  >
                    {item.m.sender_role === "user" ? "사용자 · " : "코치 · "}
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

      {activeSession && (
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
