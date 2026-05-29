"use client";

import { useState, useTransition } from "react";
import { supabase } from "@/lib/supabase";
import { parseAlternativeThought } from "@/lib/cbt/analysis-format";
import { loadMoreAnalyses } from "@/lib/actions/dashboard";
import { useToast } from "@/components/ui/toast";

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

export function AnalysisCardList({ items: initialItems }: { items: AnalysisItem[] }) {
  const [items, setItems] = useState<AnalysisItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialItems.length >= 5);
  const [pending, startTransition] = useTransition();
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function open(sessionId: string) {
    setOpenSessionId(sessionId);
    setLoading(true);
    setMessages([]);
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    // system 메시지(치료 프롬프트)는 모달에 노출하지 않음 — 사용자에게는 user/assistant만 표시
    const visible = (data ?? []).filter((m) => m.role !== "system");
    setMessages(visible as ChatMsg[]);
    setLoading(false);
  }

  function close() {
    setOpenSessionId(null);
    setMessages([]);
  }

  function handleLoadMore() {
    const cursor = items[items.length - 1]?.created_at;
    if (!cursor) return;
    startTransition(async () => {
      const r = await loadMoreAnalyses(cursor, 20);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      setItems((prev) => [...prev, ...(r.entries as AnalysisItem[])]);
      setHasMore(r.hasMore);
    });
  }

  return (
    <>
      <ul className="mt-4 space-y-3" data-testid="recent-analyses">
        {items.map((a) => {
          const altView = parseAlternativeThought(a.alternative_thought);
          return (
          <li
            key={a.id}
            className="p-4 rounded-toss-card bg-white border border-gs-line-soft shadow-toss-card hover:shadow-toss-card-hover hover:-translate-y-0.5 transition-all text-[13px] space-y-1.5"
          >
            <div>
              <span className="text-gs-muted-soft font-bold">상황 · </span>
              {a.situation || "—"}
            </div>
            <div>
              <span className="text-gs-muted-soft font-bold">자동사고 · </span>
              {a.automatic_thought || "—"}
            </div>
            <div className="whitespace-pre-wrap">
              <span className="text-gs-muted-soft font-bold">대안사고 · </span>
              {altView.text || "—"}
            </div>
            {/* K6·F209: 인지왜곡 태그(#점쟁이예언 등) 전체 삭제 */}
            <button
              type="button"
              onClick={() => open(a.session_id)}
              className="mt-2 text-xs font-bold text-gs-navy-bright hover:text-gs-navy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40 rounded"
            >
              대화 전체 보기 →
            </button>
          </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={pending}
          data-testid="analyses-load-more"
          className="mt-4 w-full py-3 rounded-full border border-gs-line-soft bg-white text-sm font-bold text-gs-text-strong hover:-translate-y-0.5 hover:shadow-toss-card transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40"
        >
          {pending ? "불러오는 중…" : "더 보기"}
        </button>
      )}

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
