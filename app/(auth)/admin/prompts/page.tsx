import Link from "next/link";
import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { Card, CardTitle, CardDescription } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import {
  ANALYSIS_PROMPT,
  FINALIZE_PROMPT_KO,
  DISTORTIONS,
  buildTherapyPrompt,
} from "@/lib/cbt/prompts";

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

  const therapyPreview = buildTherapyPrompt(SAMPLE_ANALYSIS, "재앙화");

  return (
    <PageLayout>
      <div className="flex items-center gap-2 mb-2">
        <Link href="/admin" className="text-sm text-gs-blue">
          ← 대시보드
        </Link>
      </div>
      <PageTitle>분석기 프롬프트 뷰어</PageTitle>
      <PageLead>
        가짜생각 분석기가 AI에 전달하는 지시문. 현재는 읽기 전용 — 수정은 코드(`lib/cbt/prompts.ts`)에서.
      </PageLead>

      <Card className="mt-4">
        <CardTitle>1단계 — 분석 프롬프트</CardTitle>
        <CardDescription>
          사용자의 첫 입력을 받아 JSON 분석 결과를 출력하는 시스템 메시지.
        </CardDescription>
        <pre className="mt-3 p-3 rounded-[10px] bg-gs-surface-muted border border-gs-line-soft text-[11px] whitespace-pre-wrap leading-[1.6] max-h-[400px] overflow-y-auto">
{ANALYSIS_PROMPT}
        </pre>
      </Card>

      <Card className="mt-4">
        <CardTitle>3단계 — 치료 대화 프롬프트 (예시)</CardTitle>
        <CardDescription>
          사용자가 인지왜곡을 선택한 후 적용되는 5단계 대화 프롬프트. 아래는 샘플 데이터로 빌드한 예시.
        </CardDescription>
        <div className="mt-3 mb-2 text-xs text-gs-muted">
          샘플 — 상황: &quot;{SAMPLE_ANALYSIS.situation}&quot; / 선택 왜곡: 재앙화
        </div>
        <pre className="mt-3 p-3 rounded-[10px] bg-gs-surface-muted border border-gs-line-soft text-[11px] whitespace-pre-wrap leading-[1.6] max-h-[400px] overflow-y-auto">
{therapyPreview}
        </pre>
      </Card>

      <Card className="mt-4">
        <CardTitle>4단계 — 마무리 JSON 프롬프트</CardTitle>
        <CardDescription>
          대화 종료 시 저장용 JSON을 생성하는 시스템 메시지.
        </CardDescription>
        <pre className="mt-3 p-3 rounded-[10px] bg-gs-surface-muted border border-gs-line-soft text-[11px] whitespace-pre-wrap leading-[1.6] max-h-[400px] overflow-y-auto">
{FINALIZE_PROMPT_KO}
        </pre>
      </Card>

      <Card className="mt-4">
        <CardTitle>11개 인지왜곡 정의</CardTitle>
        <CardDescription>
          각 왜곡의 goal/advice/warning. 치료 프롬프트에서 변수로 주입됨.
        </CardDescription>
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

      <Card className="mt-4 bg-gs-warning-bg border-gs-warning-border">
        <CardTitle>운영 메모</CardTitle>
        <ul className="mt-2 text-xs text-gs-text-soft space-y-1 list-disc list-inside">
          <li>현재 chat.ts는 단일 prompt만 사용 — 4단계 흐름은 아직 미적용 (F42 대기 중)</li>
          <li>수정하려면 `lib/cbt/prompts.ts` 파일 직접 편집 + 배포 필요</li>
          <li>향후 DB 기반 편집기로 확장 가능 (현재는 단순화 위해 코드 박힘)</li>
        </ul>
      </Card>
    </PageLayout>
  );
}
