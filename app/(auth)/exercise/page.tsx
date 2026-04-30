"use client";

import { useState } from "react";
import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { Card, CardTitle, CardDescription } from "@/components/card";
import { logExercise } from "@/lib/actions/exercise";
import { useToast } from "@/components/ui/toast";

type Mode = null | "courage" | "exposure";

export default function ExercisePage() {
  const [mode, setMode] = useState<Mode>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSave() {
    if (!title.trim() || !mode) return;
    setSaving(true);
    const r = await logExercise({ mode, title: title.trim(), note: note.trim() || undefined });
    setSaving(false);
    if (!r.ok) {
      toast.show(r.error, "error");
      return;
    }
    toast.show("기록이 저장되었습니다", "success");
    setTitle("");
    setNote("");
  }

  if (!mode) {
    return (
      <PageLayout>
        <PageTitle>행동연습장</PageTitle>
        <PageLead>어떤 연습을 시작할까요?</PageLead>

        <div className="mt-6 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <button
            type="button"
            onClick={() => setMode("courage")}
            className="p-8 rounded-[18px] border-2 border-gs-line bg-white text-left hover:border-gs-blue transition-all shadow-gs-card cursor-pointer"
          >
            <h2 className="text-[20px] font-[950] mb-2">용기있는 행동</h2>
            <p className="text-[14px] text-gs-muted leading-[1.6]">
              우울할 때, 작은 활동 하나가 가장 강력한 무기입니다.
              <br />
              활동지도에서 2~10분 행동을 골라보세요.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode("exposure")}
            className="p-8 rounded-[18px] border-2 border-gs-line bg-white text-left hover:border-gs-blue transition-all shadow-gs-card cursor-pointer"
          >
            <h2 className="text-[20px] font-[950] mb-2">불안노출</h2>
            <p className="text-[14px] text-gs-muted leading-[1.6]">
              불안한 상황에 조금씩 노출하면 뇌가 &quot;안전하다&quot;는 걸 학습합니다.
              <br />
              가장 쉬운 것부터 시작해보세요.
            </p>
          </button>
        </div>
      </PageLayout>
    );
  }

  const isCourage = mode === "courage";

  return (
    <PageLayout>
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => setMode(null)}
          className="text-gs-muted hover:text-[#111827] text-[14px]"
        >
          ← 뒤로
        </button>
        <PageTitle>
          {isCourage ? "용기있는 행동" : "불안노출 연습"}
        </PageTitle>
      </div>

      <Card>
        <CardTitle>
          {isCourage ? "오늘 해볼 활동 기록" : "오늘 노출 기록"}
        </CardTitle>
        <CardDescription>
          {isCourage
            ? "작은 활동을 하나 골라 기록해보세요. 완료만으로 충분해요."
            : "노출 순위표에서 가장 쉬운 것 1개를 골라 기록해보세요."}
        </CardDescription>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[13px] font-bold text-[#374151] block mb-1">
              {isCourage ? "무엇을 했나요?" : "무엇에 노출했나요?"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isCourage
                  ? "예) 5분 산책, 설거지, 친구에게 문자"
                  : "예) 엘리베이터 타기, 발표 연습"
              }
              className="w-full px-3 py-2.5 border border-[rgba(226,232,240,0.9)] rounded-[14px] text-[14px] outline-none focus:border-gs-blue"
            />
          </div>
          <div>
            <label className="text-[13px] font-bold text-[#374151] block mb-1">
              {isCourage ? "기분이 어땠나요?" : "불안 점수 (0~100)"}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isCourage ? "예) 생각보다 괜찮았다" : "예) 시작 전 70 → 끝나고 40"
              }
              className="w-full px-3 py-2.5 border border-[rgba(226,232,240,0.9)] rounded-[14px] text-[14px] outline-none focus:border-gs-blue"
            />
          </div>
          <button
            type="button"
            disabled={saving || !title.trim()}
            onClick={handleSave}
            className="border-[rgba(37,99,235,0.35)] border bg-gs-blue-light rounded-xl px-4 py-2.5 text-[13px] font-[950] cursor-pointer hover:translate-y-[-1px] hover:shadow-gs-card transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "저장 중..." : "기록 저장"}
          </button>
        </div>
      </Card>
    </PageLayout>
  );
}
