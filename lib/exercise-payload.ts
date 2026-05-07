/**
 * F6 — 행동연습장 3단 페이로드 (계획·실행·회고).
 * exercise_logs.note 컬럼에 JSON 직렬화로 저장.
 */
export interface ExercisePayload {
  plan: { what: string; when?: string; whereWho?: string };
  execution?: { did: boolean; before?: number; after?: number };
  reflection?: string;
}

/** note(JSON)을 안전하게 파싱. 실패하면 plain text 객체. */
export function parseExerciseNote(
  note: string | null | undefined,
): ExercisePayload | { plain: string } {
  if (!note) return { plain: "" };
  try {
    const parsed = JSON.parse(note);
    if (parsed && typeof parsed === "object" && "plan" in parsed) {
      return parsed as ExercisePayload;
    }
    return { plain: note };
  } catch {
    return { plain: note };
  }
}
