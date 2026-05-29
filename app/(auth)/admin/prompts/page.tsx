import Link from "next/link";
import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { Card, CardTitle, CardDescription } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import {
  ANALYSIS_PROMPT,
  FINALIZE_PROMPT_KO,
  TRASH_SYSTEM_PROMPT,
  DISTORTIONS,
  buildTherapyPrompt,
} from "@/lib/cbt/prompts";
import { getPrompts, KNOWN_TEMPLATE_PLACEHOLDERS } from "@/lib/cbt/prompts-loader";
import { PromptsEditor } from "./prompts-editor";

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

  const prompts = await getPrompts();
  const therapyPreview = buildTherapyPrompt(SAMPLE_ANALYSIS, "재앙화");

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
    <PageLayout>
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin" className="text-sm text-gs-blue">
          ← 대시보드
        </Link>
      </div>
      <PageTitle>분석기 프롬프트 편집</PageTitle>
      <PageLead>
        AI에 전달되는 시스템 메시지를 직접 편집할 수 있어요. 비워두면 코드에 박힌 기본값(fallback)으로 자동 복귀합니다.
      </PageLead>

      <Card className="mt-4 bg-gs-warning-bg border-gs-warning-border">
        <CardTitle>주의</CardTitle>
        <ul className="mt-2 text-xs text-gs-text-soft space-y-1 list-disc list-inside">
          <li>잘못 수정하면 분석기 응답이 깨질 수 있어요. 항상 백업 후 수정하세요.</li>
          <li>치료 대화 템플릿의 placeholder는 정확히 표기해야 치환됩니다. 모르는 placeholder는 OpenAI에 그대로 전달됩니다.</li>
          <li>진행 중인 세션은 이미 저장된 system prompt로 계속됩니다. 새 세션부터 새 prompt가 적용돼요.</li>
        </ul>
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
    </PageLayout>
  );
}
