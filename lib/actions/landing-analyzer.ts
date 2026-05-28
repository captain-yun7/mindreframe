"use server";

import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { detectCrisis, CRISIS_GUIDE_MESSAGE } from "@/lib/cbt/crisis-detection";
import { ANALYSIS_PROMPT, type AnalysisResult } from "@/lib/cbt/prompts";

/**
 * H6/F122 — 랜딩 비로그인 분석기.
 *
 * 정책:
 *  - 같은 anonymous_id 1회만 허용
 *  - 같은 IP 일일 5회까지 (abuse 차단)
 *  - 같은 content_hash 무시 (재시도 중복)
 *  - ENV LANDING_ANALYZER_DAILY_CAP (default 100) 초과 시 모든 익명 차단
 *
 * 결과: 분석기 정식 결과의 축약 버전 — 인지왜곡 1~3개 + 짧은 대안. 결과 저장은 익명 row에 jsonb로.
 */

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const DAILY_CAP = Number(process.env.LANDING_ANALYZER_DAILY_CAP ?? 100);
const IP_DAILY_LIMIT = 5;

interface AnalyzeResult {
  ok: boolean;
  result?: AnalysisResult;
  alreadyUsed?: boolean;
  crisis?: boolean;
  error?: string;
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text.trim().normalize("NFC")).digest("hex");
}

async function getClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const xf = h.get("x-forwarded-for");
    if (xf) return xf.split(",")[0]?.trim() ?? null;
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}

function todayUtcStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function analyzeAnonymous({
  anonymousId,
  content,
}: {
  anonymousId: string;
  content: string;
}): Promise<AnalyzeResult> {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: "내용을 입력해주세요" };
  if (trimmed.length > 2000) return { ok: false, error: "2000자 이내로 작성해주세요" };
  if (!/^[0-9a-f-]{36}$/i.test(anonymousId))
    return { ok: false, error: "잘못된 요청입니다" };

  // 위기 감지 — 분석 차단
  if (detectCrisis(trimmed).level === "warn") {
    return { ok: true, crisis: true, error: CRISIS_GUIDE_MESSAGE };
  }

  const today = todayUtcStart().toISOString();
  const hash = sha256Hex(trimmed);
  const clientIp = await getClientIp();

  // 1) 같은 anonymous_id 사용 이력 확인
  const { data: prevAnon } = await supabaseAdmin
    .from("landing_analyzer_usage")
    .select("id, result")
    .eq("anonymous_id", anonymousId)
    .order("used_at", { ascending: false })
    .limit(1);

  if (prevAnon && prevAnon.length > 0) {
    // 같은 content_hash면 캐시된 결과 반환 (재시도 친화), 다른 hash면 차단
    const cached = prevAnon[0].result as AnalysisResult | null;
    return {
      ok: true,
      alreadyUsed: true,
      result: cached ?? undefined,
    };
  }

  // 2) IP 일일 cap
  if (clientIp) {
    const { count: ipCount } = await supabaseAdmin
      .from("landing_analyzer_usage")
      .select("id", { count: "exact", head: true })
      .eq("client_ip", clientIp)
      .gte("used_at", today);
    if (typeof ipCount === "number" && ipCount >= IP_DAILY_LIMIT) {
      return {
        ok: false,
        error: "오늘은 더 이상 무료 분석이 어려워요. 가입 후 이용해주세요.",
      };
    }
  }

  // 3) 전체 일일 cap
  const { count: totalCount } = await supabaseAdmin
    .from("landing_analyzer_usage")
    .select("id", { count: "exact", head: true })
    .gte("used_at", today);
  if (typeof totalCount === "number" && totalCount >= DAILY_CAP) {
    return {
      ok: false,
      error: "오늘 무료 체험이 모두 소진되었어요. 가입 후 이용해주세요.",
    };
  }

  // 4) OpenAI 호출
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return { ok: false, error: "분석 서비스 임시 점검 중" };

  let parsed: AnalysisResult;
  try {
    const resp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          { role: "user", content: trimmed },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 600,
      }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      return { ok: false, error: "분석 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." };
    }
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    parsed = JSON.parse(text) as AnalysisResult;
    if (!parsed || !Array.isArray(parsed.distortions)) {
      return { ok: false, error: "분석 결과를 만들지 못했어요. 좀 더 구체적으로 적어주세요." };
    }
  } catch {
    return { ok: false, error: "분석 호출 실패. 잠시 후 다시 시도해주세요." };
  }

  // 5) 사용 row 저장
  await supabaseAdmin.from("landing_analyzer_usage").insert({
    anonymous_id: anonymousId,
    client_ip: clientIp,
    content_hash: hash,
    result: parsed as unknown as Record<string, unknown>,
  });

  return { ok: true, result: parsed };
}
