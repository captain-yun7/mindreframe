"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Card } from "@/components/card";
import { useToast } from "@/components/ui/toast";
import {
  type CoachMessage,
  type CoachSessionSummary,
  startCoachSession,
  endCoachSession,
  sendCoachMessage,
  getCoachMessages,
} from "@/lib/actions/coach-chat";

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
  const [messages, setMessages] = useState<CoachMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 활성 세션 동안 10초마다 폴링으로 새 메시지 가져오기
  useEffect(() => {
    if (!session || session.status !== "active") return;
    const timer = setInterval(async () => {
      const r = await getCoachMessages(session.id);
      if (r.ok) setMessages(r.messages);
    }, 10_000);
    return () => clearInterval(timer);
  }, [session]);

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
      });
      setMessages([]);
    });
  }

  function handleSend() {
    if (!session || !input.trim()) return;
    const content = input.trim();
    const optimistic: CoachMessage = {
      id: `tmp-${Date.now()}`,
      sender_role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    startTransition(async () => {
      const r = await sendCoachMessage(session.id, content);
      if (!r.ok) {
        toast.show(r.error, "error");
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setInput(content);
        return;
      }
      // 최신 메시지 다시 fetch
      const fresh = await getCoachMessages(session.id);
      if (fresh.ok) setMessages(fresh.messages);
    });
  }

  function handleEnd() {
    if (!session) return;
    if (!confirm("이 대화를 종료할까요? 종료하면 새 세션은 주간 카운트에 포함돼요.")) return;
    startTransition(async () => {
      const r = await endCoachSession(session.id);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      setSession(undefined);
      setMessages([]);
      toast.show("대화를 종료했어요", "success");
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
      <div className="px-4 py-3 border-b border-gs-line-soft flex justify-between items-center bg-gs-surface-muted">
        <div className="text-sm font-bold">상담사와 대화 중</div>
        <button
          type="button"
          onClick={handleEnd}
          disabled={pending}
          className="text-xs text-gs-muted hover:text-gs-text"
        >
          대화 종료
        </button>
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
