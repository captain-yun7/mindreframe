import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  ANALYSIS_PROMPT,
  FINALIZE_PROMPT_KO,
  TRASH_SYSTEM_PROMPT,
  DISTORTIONS,
  type AnalysisResult,
  buildTherapyPrompt as buildTherapyPromptFallback,
} from "@/lib/cbt/prompts";

/**
 * J3 / F144 — site_settings에서 prompt 4종을 불러오고
 * 비어있거나 fetch 실패 시 코드 const fallback 사용.
 *
 * 키:
 *   prompt_analyzer_main     → ANALYSIS_PROMPT
 *   prompt_analyzer_therapy  → buildTherapyPrompt 템플릿 (placeholder 치환)
 *   prompt_analyzer_finalize → FINALIZE_PROMPT_KO
 *   prompt_trash_main        → TRASH_SYSTEM_PROMPT
 *
 * 템플릿 placeholder (단순 string replace):
 *   {{situation}} {{automatic_thought}} {{emotion_name}} {{emotion_intensity}}
 *   {{distortion}} {{goal}} {{advice}} {{warning}}
 */

const PROMPT_KEYS = [
  "prompt_analyzer_main",
  "prompt_analyzer_therapy",
  "prompt_analyzer_finalize",
  "prompt_trash_main",
] as const;

type PromptKey = (typeof PROMPT_KEYS)[number];

export interface Prompts {
  analyzerMain: string;
  analyzerTherapyTemplate: string; // raw template (with placeholders) or "" if not set
  analyzerFinalize: string;
  trashMain: string;
  /** 어느 키가 DB값을 쓰고 있는지 (UI 표시용) */
  source: Record<PromptKey, "db" | "fallback">;
}

let cache: { value: Prompts; expiresAt: number } | null = null;
const CACHE_MS = 30_000;

async function fetchFromDb(): Promise<Record<PromptKey, string>> {
  const out: Record<PromptKey, string> = {
    prompt_analyzer_main: "",
    prompt_analyzer_therapy: "",
    prompt_analyzer_finalize: "",
    prompt_trash_main: "",
  };
  try {
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb
      .from("site_settings")
      .select("key, value")
      .in("key", PROMPT_KEYS as unknown as string[]);
    if (error || !data) return out;
    for (const row of data) {
      const k = row.key as PromptKey;
      if (PROMPT_KEYS.includes(k) && typeof row.value === "string") {
        out[k] = row.value;
      }
    }
  } catch {
    // fetch 실패 — fallback
  }
  return out;
}

export async function getPrompts(): Promise<Prompts> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  const db = await fetchFromDb();

  const pick = (key: PromptKey, fallback: string): { value: string; source: "db" | "fallback" } => {
    const v = (db[key] ?? "").trim();
    if (v) return { value: db[key], source: "db" };
    return { value: fallback, source: "fallback" };
  };

  const main = pick("prompt_analyzer_main", ANALYSIS_PROMPT);
  const therapy = pick("prompt_analyzer_therapy", "");
  const finalize = pick("prompt_analyzer_finalize", FINALIZE_PROMPT_KO);
  const trash = pick("prompt_trash_main", TRASH_SYSTEM_PROMPT);

  const prompts: Prompts = {
    analyzerMain: main.value,
    analyzerTherapyTemplate: therapy.value,
    analyzerFinalize: finalize.value,
    trashMain: trash.value,
    source: {
      prompt_analyzer_main: main.source,
      prompt_analyzer_therapy: therapy.source,
      prompt_analyzer_finalize: finalize.source,
      prompt_trash_main: trash.source,
    },
  };

  cache = { value: prompts, expiresAt: now + CACHE_MS };
  return prompts;
}

/** 캐시 즉시 무효화 (admin 저장 직후 호출) */
export function invalidatePromptsCache() {
  cache = null;
}

/**
 * 3단계 치료 프롬프트 빌드.
 * - DB에 템플릿이 비어있으면 코드의 buildTherapyPrompt fallback 사용.
 * - 템플릿이 있으면 placeholder 치환 (단순 string replace — eval/Function 금지).
 */
export async function buildTherapyPromptViaDb(
  analysis: AnalysisResult,
  selectedDistortionName: string,
): Promise<string> {
  const info = DISTORTIONS[selectedDistortionName];
  if (!info) {
    throw new Error(`Unknown distortion: ${selectedDistortionName}`);
  }

  const { analyzerTherapyTemplate } = await getPrompts();
  if (!analyzerTherapyTemplate.trim()) {
    return buildTherapyPromptFallback(analysis, selectedDistortionName);
  }

  const replacements: Record<string, string> = {
    "{{situation}}": analysis.situation ?? "",
    "{{automatic_thought}}": analysis.automatic_thought ?? "",
    "{{emotion_name}}": analysis.emotion?.name ?? "",
    "{{emotion_intensity}}": String(analysis.emotion?.intensity ?? ""),
    "{{distortion}}": selectedDistortionName,
    "{{goal}}": info.goal,
    "{{advice}}": info.advice,
    "{{warning}}": info.warning,
  };

  let out = analyzerTherapyTemplate;
  for (const [token, value] of Object.entries(replacements)) {
    out = out.split(token).join(value);
  }
  return out;
}

/** 운영자가 알 수 있게 등록된 placeholder 키 (UI 미리보기/검증용) */
export const KNOWN_TEMPLATE_PLACEHOLDERS = [
  "{{situation}}",
  "{{automatic_thought}}",
  "{{emotion_name}}",
  "{{emotion_intensity}}",
  "{{distortion}}",
  "{{goal}}",
  "{{advice}}",
  "{{warning}}",
] as const;

/* ────────────────────────────────────────────────────────────
 * F216 — 어드민 AI 모델 선택
 *   key:   model_analyzer / model_therapy / model_trash
 *   value: 모델명 (gpt-4o-mini 등). 빈값일 때는 코드 default.
 *
 * 코드 default — ENV → 하드코딩 fallback 순.
 * 어드민에서 site_settings에 모델명 입력 시 그 값이 최우선.
 * ──────────────────────────────────────────────────────────── */

export const MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "gpt-4o-mini (빠름·저렴·기본)" },
  { value: "gpt-4o", label: "gpt-4o (균형)" },
  { value: "gpt-4.1", label: "gpt-4.1 (안정·JSON)" },
  { value: "gpt-5-mini", label: "gpt-5-mini (추론 강·느림·주의)" },
] as const;

export const ALLOWED_MODEL_VALUES = new Set(MODEL_OPTIONS.map((o) => o.value));

const MODEL_KEYS = [
  "model_analyzer",
  "model_therapy",
  "model_trash",
] as const;

type ModelKey = (typeof MODEL_KEYS)[number];

const MODEL_DEFAULTS: Record<ModelKey, string> = {
  model_analyzer: process.env.ANALYZER_MODEL ?? "gpt-4.1",
  model_therapy: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  model_trash: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
};

export interface Models {
  analyzer: string;
  therapy: string;
  trash: string;
  source: Record<ModelKey, "db" | "default">;
}

let modelsCache: { value: Models; expiresAt: number } | null = null;

async function fetchModelsFromDb(): Promise<Record<ModelKey, string>> {
  const out: Record<ModelKey, string> = {
    model_analyzer: "",
    model_therapy: "",
    model_trash: "",
  };
  try {
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb
      .from("site_settings")
      .select("key, value")
      .in("key", MODEL_KEYS as unknown as string[]);
    if (error || !data) return out;
    for (const row of data) {
      const k = row.key as ModelKey;
      if (MODEL_KEYS.includes(k) && typeof row.value === "string") {
        out[k] = row.value;
      }
    }
  } catch {
    // fetch 실패 — default 사용
  }
  return out;
}

export async function getModels(): Promise<Models> {
  const now = Date.now();
  if (modelsCache && modelsCache.expiresAt > now) return modelsCache.value;

  const db = await fetchModelsFromDb();

  const pick = (
    key: ModelKey,
  ): { value: string; source: "db" | "default" } => {
    const v = (db[key] ?? "").trim();
    if (v && ALLOWED_MODEL_VALUES.has(v as never))
      return { value: v, source: "db" };
    return { value: MODEL_DEFAULTS[key], source: "default" };
  };

  const a = pick("model_analyzer");
  const t = pick("model_therapy");
  const tr = pick("model_trash");

  const models: Models = {
    analyzer: a.value,
    therapy: t.value,
    trash: tr.value,
    source: {
      model_analyzer: a.source,
      model_therapy: t.source,
      model_trash: tr.source,
    },
  };

  modelsCache = { value: models, expiresAt: now + CACHE_MS };
  return models;
}

export function invalidateModelsCache() {
  modelsCache = null;
}
