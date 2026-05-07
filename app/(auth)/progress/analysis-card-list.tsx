"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AnalysisItem {
  id: string;
  session_id: string;
  situation: string | null;
  automatic_thought: string | null;
  alternative_thought: string | null;
  distortion_types: string[] | null;
  created_at: string;
}

interface ChatMsg {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export function AnalysisCardList({ items }: { items: AnalysisItem[] }) {
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);

  async function open(sessionId: string) {
    setOpenSessionId(sessionId);
    setLoading(true);
    setMessages([]);
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as ChatMsg[]);
    setLoading(false);
  }

  function close() {
    setOpenSessionId(null);
    setMessages([]);
  }

  return (
    <>
      <ul className="mt-4 space-y-3" data-testid="recent-analyses">
        {items.map((a) => (
          <li
            key={a.id}
            className="p-4 rounded-[12px] bg-gs-surface-muted border border-gs-line-soft text-[13px] space-y-1.5"
          >
            <div>
              <span className="text-gs-muted font-bold">상황 · </span>
              {a.situation || "—"}
            </div>
            <div>
              <span className="text-gs-muted font-bold">자동사고 · </span>
              {a.automatic_thought || "—"}
            </div>
            <div>
              <span className="text-gs-muted font-bold">대안사고 · </span>
              {a.alternative_thought || "—"}
            </div>
            {Array.isArray(a.distortion_types) && a.distortion_types.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {a.distortion_types.map((d) => (
                  <span
                    key={d}
                    className="inline-block px-2 py-0.5 rounded-full text-[11px] bg-gs-blue-soft text-gs-blue-soft-fg"
                  >
                    #{d}
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => open(a.session_id)}
              className="mt-2 text-xs text-gs-blue underline hover:text-gs-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 rounded"
            >
              대화 전체 보기 →
            </button>
          </li>
        ))}
      </ul>

      {openSessionId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="대화 전체 보기"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4"
          onClick={close}
        >
          <div
            className="bg-white w-full max-w-[640px] max-h-[80vh] rounded-[18px] shadow-gs-dropdown flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-gs-line-soft flex items-center justify-between">
              <h3 className="text-base font-bold">대화 전체</h3>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="text-gs-muted hover:text-gs-text-strong text-lg leading-none px-2"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gs-surface-muted">
              {loading ? (
                <div className="text-center text-gs-muted text-sm py-8">불러오는 중...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gs-muted text-sm py-8">
                  메시지를 찾을 수 없습니다.
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-[14px] text-[13px] whitespace-pre-wrap break-words ${
                        m.role === "user"
                          ? "bg-gs-navy-bright text-white"
                          : "bg-white border border-gs-line-soft text-gs-text-strong"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
