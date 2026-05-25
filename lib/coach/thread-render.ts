import type {
  CoachMessage,
  CoachSessionSummary,
} from "@/lib/actions/coach-chat";

export type ThreadItem =
  | { kind: "msg"; m: CoachMessage }
  | { kind: "sep"; sessionId: string; label: string };

/**
 * 시간순 정렬된 messages 사이에 세션 경계 separator 삽입.
 * sessions의 status·started_at·ended_at으로 라벨 구성.
 */
export function renderWithSeparators(
  sessions: CoachSessionSummary[],
  messages: CoachMessage[],
): ThreadItem[] {
  const out: ThreadItem[] = [];
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  let lastSessionId: string | null = null;
  for (const m of messages) {
    if (m.session_id !== lastSessionId) {
      const s = sessionMap.get(m.session_id);
      if (s) {
        const startedLabel = new Date(s.started_at).toLocaleDateString("ko-KR");
        let label: string;
        if (s.status === "ended") {
          const endedLabel = s.ended_at
            ? `${new Date(s.ended_at).toLocaleDateString("ko-KR")} 종료`
            : "종료";
          label = `── ${startedLabel} 시작 · ${endedLabel} ──`;
        } else {
          label = `── ${startedLabel} 새 대화 ──`;
        }
        out.push({ kind: "sep", sessionId: s.id, label });
      }
      lastSessionId = m.session_id;
    }
    out.push({ kind: "msg", m });
  }
  return out;
}
