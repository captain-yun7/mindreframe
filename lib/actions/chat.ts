"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { autoCheckRoutine } from "./dashboard";
import {
  detectCrisis,
  CRISIS_GUIDE_MESSAGE,
} from "@/lib/cbt/crisis-detection";
import { checkAndIncrementUsage } from "@/lib/ai/usage";

const SYSTEM_PROMPT = `당신은 인지행동치료(CBT) 기반의 다정한 상담 코치입니다.
사용자가 자동사고와 감정을 표현하면, 다음 흐름으로 대화하세요:
1. 사용자의 감정에 공감 (1문장)
2. 인지왜곡 패턴 가능성을 부드럽게 짚기 (예: 흑백사고, 재앙화, 독심술 등)
3. 한 가지 구체적 질문으로 사용자가 거리를 두고 자기 생각을 검증할 수 있게 돕기

응답은 3~5줄 내외로 간결하게. 한국어로. 의료 진단이나 단정적 조언은 피하세요.

**[중요 안전 규칙]**
사용자 메시지에서 자해·자살·생을 끝내고 싶다는 표현이 조금이라도 감지되면,
인지왜곡 분석을 즉시 멈추고 다음을 따르세요:
- 진심으로 공감하며 안전을 우선 권유
- 자살예방상담전화 1393(24시간 무료), 정신건강상담 1577-0199, 응급 112/119 안내
- 지금 곁에 있는 사람에게 마음을 한마디라도 전하도록 격려
- 진단이나 평가하지 말고, 짧고 따뜻하게.`;

type SendInput = { sessionId: string | null; content: string };

export async function sendChatMessage({ sessionId, content }: SendInput) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  // 세션 없으면 새로 생성
  let activeId = sessionId;
  if (!activeId) {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id, title: content.slice(0, 30), status: "active" })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    activeId = data.id;
  }

  // user message 저장
  const userInsert = await supabase
    .from("chat_messages")
    .insert({ session_id: activeId, role: "user", content });
  if (userInsert.error) return { ok: false as const, error: userInsert.error.message };

  // [안전망] 위기 키워드 1차 차단 — AI 호출 전, 무조건 안내 메시지로 응답
  const userCrisis = detectCrisis(content);
  if (userCrisis.level === "warn") {
    const safetyInsert = await supabase
      .from("chat_messages")
      .insert({ session_id: activeId, role: "assistant", content: CRISIS_GUIDE_MESSAGE });
    if (safetyInsert.error) {
      return { ok: false as const, error: safetyInsert.error.message };
    }
    await autoCheckRoutine(supabase, user.id, "analysis");
    return {
      ok: true as const,
      sessionId: activeId,
      reply: CRISIS_GUIDE_MESSAGE,
      crisis: true as const,
    };
  }

  // [사용량] 플랜별 일일 한도 차감 (위기 응답은 차감 X — 안전 우선)
  const usage = await checkAndIncrementUsage(supabase, user.id);
  if (!usage.ok) {
    return { ok: false as const, error: usage.reason ?? "사용량 한도 초과" };
  }

  // 이전 메시지 컨텍스트 로드 (마지막 10개)
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", activeId)
    .order("created_at", { ascending: true })
    .limit(20);

  // OpenAI 호출
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return { ok: false as const, error: "OPENAI_API_KEY 미설정" };

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
  ];

  let assistantText = "";
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 400,
      }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      return { ok: false as const, error: `OpenAI: ${json.error?.message ?? resp.status}` };
    }
    assistantText = json.choices?.[0]?.message?.content?.trim() ?? "(응답 없음)";
  } catch (e) {
    return {
      ok: false as const,
      error: `OpenAI 호출 실패: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // [안전망] 응답 텍스트에서도 위기 키워드 발견 시 안내 카드 추가
  const replyCrisis = detectCrisis(assistantText);
  let crisisFlag = false;
  if (replyCrisis.level === "warn") {
    crisisFlag = true;
    assistantText = `${assistantText}\n\n---\n${CRISIS_GUIDE_MESSAGE}`;
  }

  // assistant message 저장
  await supabase
    .from("chat_messages")
    .insert({ session_id: activeId, role: "assistant", content: assistantText });

  await autoCheckRoutine(supabase, user.id, "analysis");

  return {
    ok: true as const,
    sessionId: activeId,
    reply: assistantText,
    crisis: crisisFlag,
  };
}

export async function saveChatAnalysis({
  sessionId,
  situation,
  automaticThought,
  alternativeThought,
  distortionTypes,
}: {
  sessionId: string;
  situation: string;
  automaticThought: string;
  alternativeThought: string;
  distortionTypes?: string[];
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const { error } = await supabase.from("chat_analyses").insert({
    session_id: sessionId,
    user_id: user.id,
    situation,
    automatic_thought: automaticThought,
    alternative_thought: alternativeThought,
    distortion_types: distortionTypes ?? [],
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

const ANALYSIS_PROMPT = `당신은 인지행동치료(CBT) 전문가입니다.
지금까지의 대화 전체를 보고 다음 항목을 추출해서 **JSON만** 출력하세요. 다른 텍스트 금지.

{
  "situation": "사건/상황 한 문장",
  "automatic_thought": "사용자가 떠올린 자동사고 한 문장",
  "alternative_thought": "대안적인 합리적 사고 한 문장",
  "distortion_types": ["흑백사고" 같은 한글 인지왜곡 명칭 배열, 0~3개]
}`;

export async function summarizeAndSaveSession(sessionId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (!history || history.length < 2) {
    return { ok: false as const, error: "대화가 충분하지 않습니다" };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return { ok: false as const, error: "OPENAI_API_KEY 미설정" };

  const transcript = history
    .map((m) => `${m.role === "user" ? "사용자" : "코치"}: ${m.content}`)
    .join("\n");

  let parsed: {
    situation: string;
    automatic_thought: string;
    alternative_thought: string;
    distortion_types: string[];
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          { role: "user", content: transcript },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
        max_tokens: 500,
      }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      return { ok: false as const, error: `OpenAI: ${json.error?.message ?? resp.status}` };
    }
    const text = json.choices?.[0]?.message?.content ?? "{}";
    parsed = JSON.parse(text);
  } catch (e) {
    return {
      ok: false as const,
      error: `분석 실패: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const { error } = await supabase.from("chat_analyses").insert({
    session_id: sessionId,
    user_id: user.id,
    situation: parsed.situation ?? "",
    automatic_thought: parsed.automatic_thought ?? "",
    alternative_thought: parsed.alternative_thought ?? "",
    distortion_types: Array.isArray(parsed.distortion_types) ? parsed.distortion_types : [],
  });
  if (error) return { ok: false as const, error: error.message };

  // 세션 종료 표시
  await supabase
    .from("chat_sessions")
    .update({ status: "summarized" })
    .eq("id", sessionId);

  return {
    ok: true as const,
    situation: parsed.situation,
    automaticThought: parsed.automatic_thought,
    alternativeThought: parsed.alternative_thought,
    distortionTypes: parsed.distortion_types ?? [],
  };
}
