/**
 * K1·F182/F189/F190 — OpenAI Chat Completions 호출 공용 helper.
 *
 * 목적:
 *  - timeout (AbortController) 명시
 *  - 일시적 에러(429/5xx/네트워크) 1회 retry
 *  - 통일된 에러 메시지
 *
 * 사용처: lib/actions/chat.ts, lib/actions/thought-records.ts, lib/actions/landing-analyzer.ts
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const DEFAULT_TIMEOUT_MS = 45_000; // 45s — 17초 지연 대비 여유
const RETRY_DELAY_MS = 800;

export interface OpenAIChatBody {
  model: string;
  messages: Array<{ role: string; content: string }>;
  response_format?: { type: "json_object" } | { type: "text" };
  max_completion_tokens?: number;
  temperature?: number;
  // 그 외 옵션은 사용처에서 추가
  [key: string]: unknown;
}

export type OpenAIChatResult =
  | { ok: true; text: string; finishReason: string | null }
  | { ok: false; error: string; status?: number; retryable?: boolean };

interface ChatOpts {
  timeoutMs?: number;
  retry?: boolean;
  /** 외부에서 abort 가능하도록 (선택). */
  signal?: AbortSignal;
}

/**
 * Chat Completions 단일 호출.
 * timeout + 일시적 에러 1회 retry 내장.
 */
export async function callOpenAIChat(
  body: OpenAIChatBody,
  opts: ChatOpts = {},
): Promise<OpenAIChatResult> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return { ok: false, error: "OPENAI_API_KEY 미설정" };

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const allowRetry = opts.retry !== false;

  let attempt = 0;
  let lastError = "";
  let lastStatus: number | undefined;

  // F241/F244 — gpt-5 / o-series(reasoning 모델)는:
  //   1. temperature 미지원 (400 에러) → 자동 제거
  //   2. max_completion_tokens 미설정 시 reasoning 토큰만 소모하고 content가 비어 응답 멈춤
  //      → 안전치 4000으로 보강 (호출부가 명시한 값은 존중)
  const modelStr = String(body.model ?? "");
  const isReasoningModel = /^(gpt-5|o\d)/.test(modelStr);
  const payload: OpenAIChatBody = { ...body };
  if (isReasoningModel) {
    if ("temperature" in payload) {
      delete (payload as { temperature?: number }).temperature;
    }
    if (payload.max_completion_tokens == null) {
      payload.max_completion_tokens = 4000;
    }
  }

  while (attempt < (allowRetry ? 2 : 1)) {
    attempt += 1;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    // 외부 signal 연동
    const externalAbort = () => controller.abort();
    if (opts.signal) opts.signal.addEventListener("abort", externalAbort);

    try {
      const resp = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      let json: {
        error?: { message?: string };
        choices?: Array<{
          message?: { content?: string };
          finish_reason?: string;
        }>;
      } = {};
      try {
        json = await resp.json();
      } catch {
        // 응답 본문 파싱 실패 — 상태코드만 사용
      }

      if (!resp.ok) {
        const status = resp.status;
        lastStatus = status;
        const errMsg = json.error?.message ?? `HTTP ${status}`;
        const retryable = status === 429 || (status >= 500 && status < 600);
        if (retryable && allowRetry && attempt < 2) {
          lastError = errMsg;
          await delay(RETRY_DELAY_MS);
          continue;
        }
        return {
          ok: false,
          error: `OpenAI: ${errMsg}`,
          status,
          retryable,
        };
      }

      const text = json.choices?.[0]?.message?.content?.trim() ?? "";
      const finishReason = json.choices?.[0]?.finish_reason ?? null;

      if (!text) {
        // finish_reason이 length면 토큰 부족, content_filter면 차단.
        if (finishReason === "length") {
          return {
            ok: false,
            error: "응답이 너무 길어 잘렸어요. 다시 시도해주세요.",
            retryable: false,
          };
        }
        if (finishReason === "content_filter") {
          return {
            ok: false,
            error: "안전상 응답이 차단되었어요. 다르게 표현해주세요.",
            retryable: false,
          };
        }
        // 그 외 empty — 1회 retry 시도
        if (allowRetry && attempt < 2) {
          lastError = "empty response";
          await delay(RETRY_DELAY_MS);
          continue;
        }
        return { ok: false, error: "응답이 비어있어요" };
      }

      return { ok: true, text, finishReason };
    } catch (e) {
      const isAbort = e instanceof Error && e.name === "AbortError";
      const msg = e instanceof Error ? e.message : String(e);

      if (isAbort) {
        if (opts.signal?.aborted) {
          return { ok: false, error: "요청이 취소되었어요" };
        }
        lastError = `시간 초과 (${timeoutMs / 1000}s)`;
        if (allowRetry && attempt < 2) {
          await delay(RETRY_DELAY_MS);
          continue;
        }
        return {
          ok: false,
          error: "응답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.",
          retryable: true,
        };
      }

      // 네트워크 에러 — 1회 retry
      if (allowRetry && attempt < 2) {
        lastError = msg;
        await delay(RETRY_DELAY_MS);
        continue;
      }
      return {
        ok: false,
        error: `네트워크 오류: ${msg}`,
        retryable: true,
      };
    } finally {
      clearTimeout(timeoutId);
      if (opts.signal) opts.signal.removeEventListener("abort", externalAbort);
    }
  }

  return {
    ok: false,
    error: lastError || "OpenAI 호출 실패",
    status: lastStatus,
  };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
