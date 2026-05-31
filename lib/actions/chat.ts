"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { autoCheckRoutine } from "./dashboard";
import {
  detectCrisis,
  CRISIS_GUIDE_MESSAGE,
} from "@/lib/cbt/crisis-detection";
import { checkUsageOnly, incrementUsage } from "@/lib/ai/usage";
import { type AnalysisResult } from "@/lib/cbt/prompts";
import {
  getPrompts,
  getModels,
  buildTherapyPromptViaDb,
} from "@/lib/cbt/prompts-loader";
import { callOpenAIChat } from "@/lib/ai/openai-client";

/**
 * 가짜생각 분석기 — 원본 1203토닥챗최신버전.index.html의 3-phase state machine 복원.
 *   analysis  → analyzeUserInput()
 *   therapy   → startTherapy() → continueTherapy() 반복
 *   finalize  → finalizeAndSave() (감정점수 후 응답 → 자동 트리거)
 *
 * F237 — 원본 그대로 단발 호출. 후처리(반말 검증 등) 일체 없음.
 */

// F216 — 모델은 site_settings.model_* → ENV → 코드 default 우선순위로 getModels()에서 해석.

function isCrisis(text: string) {
  return detectCrisis(text).level === "warn";
}

/* ──────────────────────────────────────────────────────────
 * 1) analyzeUserInput — 사용자 첫 입력을 분석 JSON으로 변환
 * 원본 analyzeThought() (line 471~495)
 * ────────────────────────────────────────────────────────── */
export async function analyzeUserInput({ content }: { content: string }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const trimmed = content.trim();
  if (!trimmed) return { ok: false as const, error: "내용을 입력해주세요" };

  // 위기 감지 — 분석 중단 + 안내
  if (isCrisis(trimmed)) {
    const { data: sess } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id, title: trimmed.slice(0, 30), status: "active" })
      .select("id")
      .single();
    if (sess) {
      await supabase
        .from("chat_messages")
        .insert([
          { session_id: sess.id, role: "user", content: trimmed },
          { session_id: sess.id, role: "assistant", content: CRISIS_GUIDE_MESSAGE },
        ]);
    }
    return {
      ok: true as const,
      crisis: true as const,
      sessionId: sess?.id ?? null,
      reply: CRISIS_GUIDE_MESSAGE,
    };
  }

  // 사용량 사전 체크 — finalize까지 못 가면 카운트 안 함 (H2)
  const usage = await checkUsageOnly(supabase, user.id, "analyzer");
  if (!usage.ok) {
    return { ok: false as const, error: usage.reason ?? "사용량 한도 초과" };
  }

  // 분석 호출 — site_settings prompt + model fallback.
  const [prompts, models] = await Promise.all([getPrompts(), getModels()]);
  const r = await callOpenAIChat({
    model: models.analyzer,
    messages: [
      { role: "system", content: prompts.analyzerMain },
      { role: "user", content: trimmed },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4000,
  });
  if (!r.ok) return { ok: false as const, error: r.error };

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(r.text);
  } catch {
    return { ok: false as const, error: "분석 결과 파싱 실패" };
  }
  if (!parsed || !Array.isArray(parsed.distortions)) {
    return { ok: false as const, error: "분석 결과 형식 오류" };
  }

  // 세션 + 메시지 + chat_analyses(임시) 저장
  const { data: sess, error: sessErr } = await supabase
    .from("chat_sessions")
    .insert({ user_id: user.id, title: trimmed.slice(0, 30), status: "active" })
    .select("id")
    .single();
  if (sessErr || !sess) {
    return { ok: false as const, error: sessErr?.message ?? "세션 생성 실패" };
  }

  // F238 — 원본 presentDistortions() 그대로: 여러 개면 번호 입력 안내, 1개면 자동 시작.
  const summaryLines: string[] = [
    "📊 분석 결과",
    "",
    `상황: ${parsed.situation}`,
    `자동사고: ${parsed.automatic_thought}`,
    `감정: ${parsed.emotion?.name ?? ""} (${parsed.emotion?.intensity ?? 0}점)`,
    "",
    "발견된 인지왜곡:",
    ...parsed.distortions.map(
      (d, i) => `${i + 1}. ${d.name}\n   → ${d.description}`,
    ),
  ];
  if (parsed.distortions.length > 1) {
    summaryLines.push("", "어떤 왜곡을 먼저 다뤄볼까요? (번호 입력)");
  } else if (parsed.distortions.length === 1) {
    summaryLines.push("", "바로 이 왜곡을 다뤄볼게요.");
  }
  const summary = summaryLines.join("\n");

  await supabase.from("chat_messages").insert([
    { session_id: sess.id, role: "user", content: trimmed },
    { session_id: sess.id, role: "assistant", content: summary },
  ]);

  // chat_analyses 임시 row — alternative_thought는 finalize 시 update
  await supabase.from("chat_analyses").insert({
    session_id: sess.id,
    user_id: user.id,
    situation: parsed.situation ?? "",
    automatic_thought: parsed.automatic_thought ?? "",
    distortion_types: parsed.distortions.map((d) => d.name),
    emotions: { before: parsed.emotion?.intensity ?? null, name: parsed.emotion?.name ?? null },
    alternative_thought: null,
  });

  revalidatePath("/chat");
  return {
    ok: true as const,
    sessionId: sess.id,
    analysis: parsed,
    summary,
  };
}

/* ──────────────────────────────────────────────────────────
 * 2) startTherapy — 인지왜곡 선택 후 첫 치료 응답 생성
 * 원본 startTherapy() (line 519~1012)
 * ────────────────────────────────────────────────────────── */
export async function startTherapy({
  sessionId,
  analysis,
  selectedDistortion,
}: {
  sessionId: string;
  analysis: AnalysisResult;
  selectedDistortion: string;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  // H2: startTherapy는 한도만 체크. 카운팅은 finalize에서만.
  const usage = await checkUsageOnly(supabase, user.id, "analyzer");
  if (!usage.ok) {
    return { ok: false as const, error: usage.reason ?? "사용량 한도 초과" };
  }

  let therapySystem: string;
  try {
    therapySystem = await buildTherapyPromptViaDb(analysis, selectedDistortion);
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "치료 프롬프트 생성 실패",
    };
  }

  const baseMessages = [{ role: "system", content: therapySystem }];
  const models = await getModels();
  const r = await callOpenAIChat({
    model: models.therapy,
    messages: baseMessages,
    max_completion_tokens: 4000,
  });
  if (!r.ok) return { ok: false as const, error: r.error };

  // F237 — 원본 그대로 단발 호출 결과 사용 (반말 검증 등 후처리 제거).
  const finalText = r.text;

  // therapy system + 첫 assistant 응답을 chat_messages에 저장.
  await supabase.from("chat_messages").insert([
    { session_id: sessionId, role: "system", content: therapySystem },
    { session_id: sessionId, role: "assistant", content: finalText },
  ]);

  revalidatePath("/chat");
  return { ok: true as const, reply: finalText };
}

/* ──────────────────────────────────────────────────────────
 * 3) continueTherapy — 치료 대화 누적
 * 원본 continueTherapy() (line 1086~1128)
 * ────────────────────────────────────────────────────────── */
export async function continueTherapy({
  sessionId,
  content,
}: {
  sessionId: string;
  content: string;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const trimmed = content.trim();
  if (!trimmed) return { ok: false as const, error: "내용을 입력해주세요" };

  // 위기 감지 — 즉시 안내 메시지로 대체
  if (isCrisis(trimmed)) {
    await supabase.from("chat_messages").insert([
      { session_id: sessionId, role: "user", content: trimmed },
      { session_id: sessionId, role: "assistant", content: CRISIS_GUIDE_MESSAGE },
    ]);
    return {
      ok: true as const,
      reply: CRISIS_GUIDE_MESSAGE,
      crisis: true as const,
      awaitingEmotionAfter: false,
    };
  }

  // H2: continueTherapy는 한도만 체크. 카운팅은 finalize에서만.
  const usage = await checkUsageOnly(supabase, user.id, "analyzer");
  if (!usage.ok) {
    return { ok: false as const, error: usage.reason ?? "사용량 한도 초과" };
  }

  // 누적된 대화 로드.
  // 원본은 startTherapy 시점에 conversationHistory=[therapyPrompt]로 초기화하므로
  // 분석 단계(첫 user + 📊 분석 결과 assistant)는 OpenAI에 포함되지 않는다.
  // → 마지막 system(치료 프롬프트) 이후의 메시지만 전달한다.
  const { data: rawHistory } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const all = rawHistory ?? [];
  let lastSystemIdx = -1;
  for (let i = all.length - 1; i >= 0; i--) {
    if (all[i].role === "system") {
      lastSystemIdx = i;
      break;
    }
  }
  const therapyHistory =
    lastSystemIdx >= 0
      ? all.slice(lastSystemIdx) // system + 그 이후 user/assistant 만
      : all;

  await supabase
    .from("chat_messages")
    .insert({ session_id: sessionId, role: "user", content: trimmed });

  const messages = [
    ...therapyHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: trimmed },
  ];

  const models = await getModels();
  const r = await callOpenAIChat({
    model: models.therapy,
    messages,
    max_completion_tokens: 4000,
  });
  if (!r.ok) return { ok: false as const, error: r.error };

  // F237 — 원본 그대로 단발 호출 결과 사용.
  let replyText = r.text;
  let replyCrisis = false;
  if (isCrisis(replyText)) {
    replyCrisis = true;
    replyText = `${replyText}\n\n---\n${CRISIS_GUIDE_MESSAGE}`;
  }

  await supabase
    .from("chat_messages")
    .insert({ session_id: sessionId, role: "assistant", content: replyText });

  // 감정점수(후) 묻는 패턴 감지 — 원본 regex 그대로
  const awaitingEmotionAfter =
    /(감정|불안|강도)\s*(점수|몇\s*점|점)/.test(replyText) &&
    /(다시|재확인|마지막|지금)/.test(replyText);

  revalidatePath("/chat");
  return {
    ok: true as const,
    reply: replyText,
    crisis: replyCrisis,
    awaitingEmotionAfter,
  };
}

/* ──────────────────────────────────────────────────────────
 * 4) finalizeAndSave — 감정점수(후) 후 다음 응답에서 자동 호출
 * 원본 saveToGrowthRoom() (line 1016~1082)
 * ────────────────────────────────────────────────────────── */
interface FinalizeJson {
  날짜?: string;
  상황?: string;
  자동사고?: string;
  감정_이름?: string;
  감정점수_전?: number;
  감정점수_후?: number;
  왜곡별합리적사고?: Array<{ 인지왜곡?: string; 합리적사고?: string }>;
}

export async function finalizeAndSave({
  sessionId,
  emotionAfterScore,
}: {
  sessionId: string;
  emotionAfterScore: number;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  // 캐시된 분석 row 조회
  const { data: analysisRow } = await supabase
    .from("chat_analyses")
    .select("id, situation, automatic_thought, distortion_types, emotions")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  // 대화 history (system 제외)
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  const convo = (history ?? []).filter((m) => m.role !== "system");

  const today = new Date().toISOString().slice(0, 10);
  const beforeEmotion =
    analysisRow?.emotions && typeof analysisRow.emotions === "object"
      ? (analysisRow.emotions as Record<string, unknown>).before
      : null;
  const emotionName =
    analysisRow?.emotions && typeof analysisRow.emotions === "object"
      ? (analysisRow.emotions as Record<string, unknown>).name
      : null;
  const distortions = (analysisRow?.distortion_types ?? []) as string[];

  const inputMaterial = [
    `아래 정보를 참고해서, 반드시 규칙대로 "저장용 JSON 1개"만 출력해.`,
    ``,
    `날짜: ${today}`,
    `상황: ${analysisRow?.situation ?? ""}`,
    `자동사고: ${analysisRow?.automatic_thought ?? ""}`,
    `감정_이름: ${emotionName ?? ""}`,
    `감정점수_전: ${beforeEmotion ?? ""}`,
    `감정점수_후: ${emotionAfterScore}`,
    `인지왜곡들: ${distortions.join(", ")}`,
    ``,
    `대화(참고용):`,
  ].join("\n");

  const [prompts, models] = await Promise.all([getPrompts(), getModels()]);
  const r = await callOpenAIChat({
    model: models.therapy,
    messages: [
      { role: "system", content: prompts.analyzerFinalize },
      { role: "user", content: inputMaterial },
      ...convo.map((m) => ({ role: m.role, content: m.content })),
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4000,
  });
  if (!r.ok) return { ok: false as const, error: r.error };

  let parsed: FinalizeJson;
  try {
    parsed = JSON.parse(r.text);
  } catch {
    return { ok: false as const, error: "마무리 JSON 파싱 실패" };
  }

  const rationalList = Array.isArray(parsed.왜곡별합리적사고)
    ? parsed.왜곡별합리적사고
    : [];

  // 사용자에게 보여줄 합리적사고 요약 (사람이 읽기 위한 텍스트)
  const summary =
    rationalList.length > 0
      ? rationalList
          .map((r, i) => `${i + 1}. ${r.인지왜곡 ?? ""}: ${r.합리적사고 ?? ""}`)
          .join("\n")
      : "";

  // chat_analyses UPDATE — alternative_thought / emotions 양쪽 채움
  const alternativeText = JSON.stringify(rationalList);
  const emotions = {
    before: parsed.감정점수_전 ?? beforeEmotion ?? null,
    after: parsed.감정점수_후 ?? emotionAfterScore,
    name: parsed.감정_이름 ?? emotionName ?? null,
  };

  if (analysisRow?.id) {
    await supabase
      .from("chat_analyses")
      .update({
        alternative_thought: alternativeText,
        emotions,
        distortion_types: distortions,
      })
      .eq("id", analysisRow.id);
  } else {
    await supabase.from("chat_analyses").insert({
      session_id: sessionId,
      user_id: user.id,
      situation: parsed.상황 ?? "",
      automatic_thought: parsed.자동사고 ?? "",
      distortion_types: distortions,
      emotions,
      alternative_thought: alternativeText,
    });
  }

  await supabase
    .from("chat_sessions")
    .update({ status: "summarized" })
    .eq("id", sessionId);

  await autoCheckRoutine(supabase, user.id, "analysis");

  // H2: 분석기 카운팅은 finalize 1회만 (analyzeUserInput/startTherapy/continueTherapy는 사전 체크만)
  await incrementUsage(supabase, user.id, "analyzer");

  revalidatePath("/progress");
  revalidatePath("/dashboard");
  revalidatePath("/chat");

  return {
    ok: true as const,
    summary,
    rational: rationalList,
    emotions,
  };
}

/* ──────────────────────────────────────────────────────────
 * Legacy: 백업용 수동 종료 (UI에서 명시적 종료 버튼)
 * 원본 흐름 외 우리 백업 경로.
 * ────────────────────────────────────────────────────────── */
export async function summarizeAndSaveSession(sessionId: string) {
  // 감정점수 후를 모르는 채 수동 종료할 때를 대비해 0으로 finalize
  return finalizeAndSave({ sessionId, emotionAfterScore: 0 });
}
