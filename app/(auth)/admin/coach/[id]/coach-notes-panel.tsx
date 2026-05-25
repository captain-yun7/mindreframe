"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/card";
import { useToast } from "@/components/ui/toast";
import {
  addCoachNote,
  deleteCoachNote,
  type CoachNote,
} from "@/lib/actions/coach-notes";

interface Props {
  userId: string;
  initialNotes: CoachNote[];
  viewerRole: "coach" | "admin";
  viewerId: string;
}

export function CoachNotesPanel({
  userId,
  initialNotes,
  viewerRole,
  viewerId,
}: Props) {
  const [notes, setNotes] = useState<CoachNote[]>(initialNotes);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleAdd() {
    const text = input.trim();
    if (!text) return;
    startTransition(async () => {
      const r = await addCoachNote(userId, text);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      setNotes((prev) => [r.note, ...prev]);
      setInput("");
    });
  }

  function handleDel(id: string) {
    if (!confirm("이 메모를 삭제할까요?")) return;
    startTransition(async () => {
      const r = await deleteCoachNote(id);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== id));
    });
  }

  return (
    <Card className="p-4">
      <div className="flex justify-between mb-2">
        <div className="text-sm font-bold">코치 메모</div>
        <div className="text-[10px] text-gs-muted">
          {viewerRole === "admin" ? "모든 코치 메모" : "내 메모만"}
        </div>
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="이 사용자에 대한 메모..."
        className="w-full text-sm p-2 border border-gs-line-soft rounded-[10px] resize-none focus:outline-none focus:ring-2 focus:ring-gs-blue/40"
        rows={3}
      />
      <div className="flex justify-end mt-1">
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending || !input.trim()}
          className="px-3 py-1 rounded-[10px] bg-gs-blue text-white text-xs font-bold disabled:opacity-50"
        >
          메모 추가
        </button>
      </div>

      <ul className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
        {notes.length === 0 ? (
          <li className="text-xs text-gs-muted">아직 메모 없음</li>
        ) : (
          notes.map((n) => {
            const canDelete = n.coach_id === viewerId;
            return (
              <li
                key={n.id}
                className="text-xs border-l-2 border-gs-line-soft pl-2"
              >
                <div className="whitespace-pre-wrap">{n.note}</div>
                <div className="mt-0.5 text-[10px] text-gs-muted flex justify-between">
                  <span>
                    {viewerRole === "admin" && n.coach_nickname
                      ? `${n.coach_nickname} · `
                      : ""}
                    {new Date(n.created_at).toLocaleString("ko-KR")}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDel(n.id)}
                      disabled={pending}
                      className="text-gs-danger hover:underline disabled:opacity-50"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </Card>
  );
}
