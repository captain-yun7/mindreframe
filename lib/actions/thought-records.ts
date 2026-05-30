"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { autoCheckRoutine } from "./dashboard";
import {
  detectCrisis,
  CRISIS_GUIDE_MESSAGE,
} from "@/lib/cbt/crisis-detection";
import { checkUsageOnly, incrementUsage } from "@/lib/ai/usage";
import { getPrompts, getModels } from "@/lib/cbt/prompts-loader";
import { callOpenAIChat } from "@/lib/ai/openai-client";
import {
  isLikelyPlainSpeech,
  REPHRASE_TO_POLITE_INSTRUCTION,
} from "@/lib/cbt/tone-check";

type ThoughtInput = {
  situation: string;
  thought?: string;
  emotion?: string;
  bodyReaction?: string;
  behavior?: string;
};

export async function addThoughtRecord(input: ThoughtInput) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("thought_records")
    .insert({
      user_id: user.id,
      situation: input.situation,
      thought: input.thought ?? "",
      emotion: input.emotion ?? "",
      body_reaction: input.bodyReaction ?? null,
      behavior: input.behavior ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };
  await autoCheckRoutine(supabase, user.id, "trash");
  revalidatePath("/progress");
  revalidatePath("/dashboard");
  revalidatePath("/trash");
  return { ok: true as const, id: data.id };
}

export async function listThoughtRecords() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("thought_records")
    .select("id, situation, thought, emotion, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, records: data };
}

/* ──────────────────────────────────────────────────────────
 * 생각쓰레기통 — AI 자유 대화 + JSON 추출
 * 원본 trash.html L872~904 sendToGPT() 흐름 복원.
 *
 *   1. TRASH_SYSTEM_PROMPT + 누적 history + user 메시지로 OpenAI 호출
 *   2. 응답에서 ```json``` 코드블록 추출 시도 → 성공하면 thought_records INSERT
 *   3. 화면 표시용 텍스트는 JSON 블록을 strip 한 버전 반환
 * ────────────────────────────────────────────────────────── */
// F216 — 모델은 site_settings.model_trash → ENV → gpt-4o-mini default (getModels()에서 해석).

export interface TrashMsg {
  role: "user" | "assistant";
  content: string;
}

interface TrashJson {
  situation?: string;
  thought?: string;
  emotion_name?: string;
  emotion_intensity?: number;
  body_reaction?: string;
  behavior?: string;
}

function extractTrashJson(text: string): TrashJson | null {
  const start = text.indexOf("```json");
  if (start === -1) return null;
  const end = text.indexOf("```", start + 7);
  if (end === -1) return null;
  const jsonPart = text.substring(start + 7, end).trim();
  try {
    const parsed = JSON.parse(jsonPart);
    if (parsed && typeof parsed === "object") return parsed as TrashJson;
    return null;
  } catch {
    return null;
  }
}

function stripJsonBlock(text: string): string {
  return text
    .replace(/### 저장용 데이터\(JSON\)[\s\S]*?```json[\s\S]*?```/g, "")
    .replace(/```json[\s\S]*?```/g, "")
    .trim();
}

export async function sendTrashMessage({
  history,
  content,
}: {
  history: TrashMsg[];
  content: string;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const trimmed = content.trim();
  if (!trimmed) return { ok: false as const, error: "내용을 입력해주세요" };

  // 위기 감지
  if (detectCrisis(trimmed).level === "warn") {
    return {
      ok: true as const,
      reply: CRISIS_GUIDE_MESSAGE,
      crisis: true as const,
      parsedRecord: null,
      saved: false,
    };
  }

  // H2: 사전 체크만 (카운팅은 JSON 추출 성공 시점)
  const usage = await checkUsageOnly(supabase, user.id, "trash");
  if (!usage.ok) {
    return { ok: false as const, error: usage.reason ?? "사용량 한도 초과" };
  }

  const [prompts, models] = await Promise.all([getPrompts(), getModels()]);
  const messages = [
    { role: "system", content: prompts.trashMain },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: trimmed },
  ];

  // K1·F182: timeout 45s + 일시적 에러 1회 retry (callOpenAIChat 내장)
  const callResult = await callOpenAIChat({
    model: models.trash,
    messages,
    max_completion_tokens: 4000,
  });
  if (!callResult.ok) {
    return { ok: false as const, error: callResult.error };
  }
  let raw = callResult.text;

  // K5·F183: 반말 응답이면 1회 자동 재요청 (존댓말 강제)
  if (isLikelyPlainSpeech(raw)) {
    const rephrased = await callOpenAIChat({
      model: models.trash,
      messages: [
        ...messages,
        { role: "assistant", content: raw },
        { role: "system", content: REPHRASE_TO_POLITE_INSTRUCTION },
        { role: "user", content: "위 안내대로 다시 작성해 주세요." },
      ],
      max_completion_tokens: 4000,
    });
    if (rephrased.ok) raw = rephrased.text;
  }

  // 응답 내부 위기 감지
  let crisis = false;
  if (detectCrisis(raw).level === "warn") {
    crisis = true;
    raw = `${raw}\n\n---\n${CRISIS_GUIDE_MESSAGE}`;
  }

  const parsedJson = extractTrashJson(raw);
  const visibleText = stripJsonBlock(raw);

  // 위기 응답이 감지된 경우 자동 저장 보류 (안전 우선) — 사용자 재입력 유도.
  // JSON 블록이 추출되면 자동 저장
  let saved = false;
  let savedId: string | null = null;
  if (!crisis && parsedJson && parsedJson.situation) {
    const intensity =
      typeof parsedJson.emotion_intensity === "number"
        ? parsedJson.emotion_intensity
        : null;
    const emotionStr = parsedJson.emotion_name
      ? intensity != null
        ? `${parsedJson.emotion_name} ${intensity}`
        : parsedJson.emotion_name
      : "";

    const { data: row, error } = await supabase
      .from("thought_records")
      .insert({
        user_id: user.id,
        situation: parsedJson.situation,
        thought: parsedJson.thought ?? "",
        emotion: emotionStr,
        body_reaction: parsedJson.body_reaction || null,
        behavior: parsedJson.behavior || null,
      })
      .select("id")
      .single();

    if (!error && row) {
      saved = true;
      savedId = row.id;
      await autoCheckRoutine(supabase, user.id, "trash");
      // H2: 쓰레기통 카운팅은 JSON 추출 + INSERT 성공 시 1회만
      await incrementUsage(supabase, user.id, "trash");
      revalidatePath("/progress");
      revalidatePath("/dashboard");
      revalidatePath("/trash");
    }
  }

  return {
    ok: true as const,
    reply: visibleText,
    crisis,
    parsedRecord: parsedJson,
    saved,
    savedId,
  };
}
