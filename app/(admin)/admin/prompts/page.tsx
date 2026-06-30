import { PageHeader } from "../_ui/page-header";
import { Card, CardTitle, CardDescription } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import {
  ANALYSIS_PROMPT,
  FINALIZE_PROMPT_KO,
  TRASH_SYSTEM_PROMPT,
  DISTORTIONS,
  buildTherapyPrompt,
} from "@/lib/cbt/prompts";
import {
  getPrompts,
  getModels,
  getMaxTokens,
  KNOWN_TEMPLATE_PLACEHOLDERS,
  MODEL_OPTIONS,
} from "@/lib/cbt/prompts-loader";
import { PromptsEditor } from "./prompts-editor";
import { ModelsEditor } from "./models-editor";
import { MaxTokensEditor } from "./max-tokens-editor";

/**
 * F248 — 두 문자열의 첫 차이 위치 + 주변 30자 snippet 추출 (진단용)
 */
function findFirstDiff(
  a: string,
  b: string,
): { index: number; line: number; col: number; dbSnippet: string; codeSnippet: string } | null {
  const len = Math.min(a.length, b.length);
  let i = 0;
  while (i < len && a[i] === b[i]) i++;
  if (i === len && a.length === b.length) return null;
  // 라인·컬럼
  let line = 1;
  let col = 1;
  for (let k = 0; k < i; k++) {
    if (a[k] === "\n") {
      line++;
      col = 1;
    } else col++;
  }
  const start = Math.max(0, i - 15);
  return {
    index: i,
    line,
    col,
    dbSnippet: a.slice(start, i + 25),
    codeSnippet: b.slice(start, i + 25),
  };
}

function escapeForDisplay(s: string): string {
  return s.replace(/\n/g, "↵").replace(/\t/g, "→");
}

const SAMPLE_ANALYSIS = {
  situation: "회의에서 발표할 때 다들 나를 무시하는 것 같았어요",
  automatic_thought: "사람들이 분명히 나를 못났다고 생각할 거야",
  emotion: { name: "불안", intensity: 80 },
  distortions: [
    { name: "독심술", description: "타인의 마음 단정" },
    { name: "재앙화", description: "최악의 시나리오 상상" },
  ],
  evidence_for: "발표 중 한 명이 한숨을 쉬었음",
  evidence_against: "다른 사람들은 고개를 끄덕였음",
};

export default async function AdminPromptsPage() {
  await requireAdmin();

  const [prompts, models, maxTokens] = await Promise.all([
    getPrompts(),
    getModels(),
    getMaxTokens(),
  ]);
  const therapyPreview = buildTherapyPrompt(SAMPLE_ANALYSIS, "재앙화");

  const maxTokensItems = [
    {
      key: "max_tokens_analyzer" as const,
      label: "1단계 분석",
      description: "JSON 추출. 원본 5/31: 1000",
      initialValue: maxTokens.rawValues.max_tokens_analyzer,
      source: maxTokens.source.max_tokens_analyzer,
      defaultValue: 1000,
      effective: maxTokens.analyzer,
    },
    {
      key: "max_tokens_therapy" as const,
      label: "치료·마무리",
      description: "치료 대화 + 마무리 JSON. 원본 5/31: 2000",
      initialValue: maxTokens.rawValues.max_tokens_therapy,
      source: maxTokens.source.max_tokens_therapy,
      defaultValue: 2000,
      effective: maxTokens.therapy,
    },
    {
      key: "max_tokens_trash" as const,
      label: "생각쓰레기통",
      description: "5요소 수집 대화. 원본 5/31: 2000",
      initialValue: maxTokens.rawValues.max_tokens_trash,
      source: maxTokens.source.max_tokens_trash,
      defaultValue: 2000,
      effective: maxTokens.trash,
    },
  ];

  const modelItems = [
    {
      key: "model_analyzer" as const,
      label: "1단계 분석",
      description: "사용자 입력 → 인지왜곡 JSON 추출.",
      initialValue: models.source.model_analyzer === "db" ? models.analyzer : "",
      source: models.source.model_analyzer,
      defaultValue: models.analyzer,
    },
    {
      key: "model_therapy" as const,
      label: "치료·마무리",
      description: "분석기 5단계 대화 + 저장용 JSON.",
      initialValue: models.source.model_therapy === "db" ? models.therapy : "",
      source: models.source.model_therapy,
      defaultValue: models.therapy,
    },
    {
      key: "model_trash" as const,
      label: "생각쓰레기통",
      description: "5요소 수집 대화.",
      initialValue: models.source.model_trash === "db" ? models.trash : "",
      source: models.source.model_trash,
      defaultValue: models.trash,
    },
  ];

  const items = [
    {
      key: "prompt_analyzer_main",
      label: "1단계 — 분석 프롬프트",
      description:
        "사용자의 첫 입력을 받아 인지왜곡 + 감정 + 자동사고를 JSON으로 출력하는 시스템 메시지.",
      initialValue: prompts.source.prompt_analyzer_main === "db" ? prompts.analyzerMain : "",
      source: prompts.source.prompt_analyzer_main,
      fallbackValue: ANALYSIS_PROMPT,
    },
    {
      key: "prompt_analyzer_therapy",
      label: "3단계 — 치료 대화 템플릿",
      description:
        "인지왜곡 선택 후 5단계 대화 가이드. placeholder {{distortion}} 등 위치에 값이 치환됩니다. 비우면 코드의 buildTherapyPrompt 함수가 사용됩니다.",
      initialValue:
        prompts.source.prompt_analyzer_therapy === "db" ? prompts.analyzerTherapyTemplate : "",
      source: prompts.source.prompt_analyzer_therapy,
      fallbackValue: therapyPreview,
      placeholders: KNOWN_TEMPLATE_PLACEHOLDERS,
    },
    {
      key: "prompt_analyzer_finalize",
      label: "4단계 — 마무리 JSON 프롬프트",
      description: "대화 종료 시 성장방 저장용 JSON을 생성하는 시스템 메시지.",
      initialValue:
        prompts.source.prompt_analyzer_finalize === "db" ? prompts.analyzerFinalize : "",
      source: prompts.source.prompt_analyzer_finalize,
      fallbackValue: FINALIZE_PROMPT_KO,
    },
    {
      key: "prompt_trash_main",
      label: "생각쓰레기통 — 시스템 프롬프트",
      description: "AI가 5요소(상황·생각·감정·신체반응·행동)를 묻고 JSON을 출력하도록 안내하는 시스템 메시지.",
      initialValue: prompts.source.prompt_trash_main === "db" ? prompts.trashMain : "",
      source: prompts.source.prompt_trash_main,
      fallbackValue: TRASH_SYSTEM_PROMPT,
    },
  ];

  return (
    <>
      <PageHeader
        title="분석기 프롬프트 편집"
        desc="AI에 전달되는 시스템 메시지를 직접 편집할 수 있어요. 비워두면 코드에 박힌 기본값(fallback)으로 자동 복귀합니다."
      />

      <Card className="mt-4 bg-gs-warning-bg border-gs-warning-border">
        <CardTitle>주의</CardTitle>
        <ul className="mt-2 text-xs text-gs-text-soft space-y-1 list-disc list-inside">
          <li>잘못 수정하면 분석기 응답이 깨질 수 있어요. 항상 백업 후 수정하세요.</li>
          <li>치료 대화 템플릿의 placeholder는 정확히 표기해야 치환됩니다. 모르는 placeholder는 OpenAI에 그대로 전달됩니다.</li>
          <li>진행 중인 세션은 이미 저장된 system prompt로 계속됩니다. 새 세션부터 새 prompt가 적용돼요.</li>
          <li>모델 변경은 즉시 다음 호출부터 반영됩니다. <b>gpt-5-mini</b>는 추론으로 응답이 느릴 수 있어요.</li>
        </ul>
      </Card>

      {/* F248 — 원본 정합성 진단 카드 */}
      <Card className="mt-4">
        <CardTitle>🔍 원본 토닥챗 정합성 진단</CardTitle>
        <CardDescription>
          현재 사용 중인 prompt와 모델이 원본(5/31 로컬 테스트 기준)과 일치하는지 한눈에 확인.
        </CardDescription>
        <div className="mt-3 space-y-2 text-[13px]">
          {items.map((it) => {
            const codeFallback = it.fallbackValue;
            const dbValue = it.initialValue;
            const usingDb = it.source === "db" && dbValue.trim().length > 0;
            const dbLen = dbValue.length;
            const codeLen = codeFallback.length;
            const charDiff =
              usingDb && dbValue !== codeFallback
                ? findFirstDiff(dbValue, codeFallback)
                : null;
            const identical = usingDb && dbValue === codeFallback;
            return (
              <div
                key={it.key}
                className="p-3 rounded-[10px] bg-gs-surface-muted border border-gs-line-soft"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <b className="text-[12.5px]">{it.label}</b>
                  <code className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-white text-gs-muted">
                    {it.key}
                  </code>
                  {!usingDb ? (
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                      ✅ 코드 fallback 사용 중 — 원본 그대로
                    </span>
                  ) : identical ? (
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                      ✅ DB값 = 코드 fallback (글자 동일)
                    </span>
                  ) : (
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-red-100 text-red-900 font-bold">
                      ⚠️ DB값이 코드 fallback과 다름
                    </span>
                  )}
                </div>
                {usingDb && !identical && (
                  <div className="mt-2 text-[11.5px] text-gs-text-soft space-y-1">
                    <div>
                      DB 길이 {dbLen.toLocaleString()}자 vs 코드 fallback{" "}
                      {codeLen.toLocaleString()}자 (차이{" "}
                      {Math.abs(dbLen - codeLen).toLocaleString()}자)
                    </div>
                    {charDiff && (
                      <div className="bg-white border border-gs-line-soft rounded p-2 font-mono text-[10.5px]">
                        <div className="text-gs-muted mb-1">
                          첫 차이 위치: 문자 {charDiff.index.toLocaleString()}번째
                          (라인 {charDiff.line}, 컬럼 {charDiff.col})
                        </div>
                        <div className="text-red-700">
                          DB: …{escapeForDisplay(charDiff.dbSnippet)}…
                        </div>
                        <div className="text-emerald-700">
                          코드: …{escapeForDisplay(charDiff.codeSnippet)}…
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="border-t border-gs-line-soft my-2" />

          {modelItems.map((m) => {
            const usingDb = m.source === "db";
            return (
              <div
                key={m.key}
                className="p-3 rounded-[10px] bg-gs-surface-muted border border-gs-line-soft"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <b className="text-[12.5px]">{m.label}</b>
                  <code className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-white text-gs-muted">
                    {m.key}
                  </code>
                  <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                    실제 사용: {m.defaultValue}
                  </span>
                  {usingDb && (
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                      DB값 = {m.initialValue}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <div className="mt-2 p-3 rounded-[10px] bg-blue-50 border border-blue-200 text-[11.5px] text-blue-900">
            <b>📋 원본 토닥챗 5/31 기준</b>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>model_analyzer: <b>gpt-4.1</b></li>
              <li>model_therapy: <b>gpt-4o-mini</b> (5/31 변경, 5/30은 gpt-5-mini)</li>
              <li>model_trash: <b>gpt-4o-mini</b></li>
              <li>모든 prompt: 5/30 ↔ 5/31 글자 단위 동일 (변경 없음)</li>
              <li>응답 형식 차이 가능성: 우리는 max_tokens 미설정 (원본 5/31은 분석 1000 / 치료 2000)</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>AI 모델 선택</CardTitle>
        <CardDescription>
          단계별로 다른 모델을 사용할 수 있어요. <code className="font-mono">(코드 default 사용)</code> 선택 시 ENV → 하드코딩 default로 복귀합니다.
        </CardDescription>
        <div className="mt-3">
          <ModelsEditor items={modelItems} options={MODEL_OPTIONS} />
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>응답 최대 길이 (max_tokens)</CardTitle>
        <CardDescription>
          단계별 응답 토큰 제한. 빈값=원본 5/31 default, <code className="font-mono">0</code>=무제한.
          넘기면 응답이 잘릴 수 있어요.
        </CardDescription>
        <div className="mt-3">
          <MaxTokensEditor items={maxTokensItems} />
        </div>
      </Card>

      <div className="mt-4">
        <PromptsEditor items={items} />
      </div>

      <Card className="mt-6">
        <CardTitle>11개 인지왜곡 정의 (참고)</CardTitle>
        <CardDescription>치료 프롬프트에서 변수로 주입되는 goal/advice/warning.</CardDescription>
        <div className="mt-3 space-y-3">
          {Object.entries(DISTORTIONS).map(([name, info]) => (
            <div
              key={name}
              className="p-3 rounded-[10px] bg-gs-surface-muted border border-gs-line-soft"
            >
              <div className="font-bold text-sm mb-1">{name}</div>
              <div className="text-xs text-gs-text-soft">
                <div>
                  <b>goal</b> · {info.goal}
                </div>
                <div>
                  <b>advice</b> · {info.advice}
                </div>
                <div>
                  <b>warning</b> · {info.warning}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
