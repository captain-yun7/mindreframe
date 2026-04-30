"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

const SYSTEM_PROMPT = `당신은 인지행동치료(CBT) 기반의 다정한 상담 코치입니다.
사용자가 자동사고와 감정을 표현하면, 다음 흐름으로 대화하세요:
1. 사용자의 감정에 공감 (1문장)
2. 인지왜곡 패턴 가능성을 부드럽게 짚기 (예: 흑백사고, 파국화, 독심술 등)
3. 한 가지 구체적 질문으로 사용자가 거리를 두고 자기 생각을 검증할 수 있게 돕기

응답은 3~5줄 내외로 간결하게. 한국어로. 의료 진단이나 단정적 조언은 피하세요.`;

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

  // assistant message 저장
  await supabase
    .from("chat_messages")
    .insert({ session_id: activeId, role: "assistant", content: assistantText });

  return { ok: true as const, sessionId: activeId, reply: assistantText };
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
