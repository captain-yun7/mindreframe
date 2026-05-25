"use client";

import { useState } from "react";
import Image from "next/image";
import { PageTitle } from "@/components/page-layout";
import { Card, CardTitle, CardDescription } from "@/components/card";
import { logExercise } from "@/lib/actions/exercise";
import { useToast } from "@/components/ui/toast";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerList, StaggerItem } from "@/components/motion/stagger-list";

type Mode = null | "courage" | "exposure";

export default function ExercisePage() {
  const [mode, setMode] = useState<Mode>(null);

  // 1단계 계획
  const [planWhat, setPlanWhat] = useState("");
  const [planWhen, setPlanWhen] = useState("");
  const [planWhereWho, setPlanWhereWho] = useState("");

  // 2단계 실행
  const [didExecute, setDidExecute] = useState<boolean | null>(null);
  const [emotionBefore, setEmotionBefore] = useState("");
  const [emotionAfter, setEmotionAfter] = useState("");

  // 3단계 회고
  const [reflection, setReflection] = useState("");

  const [saving, setSaving] = useState(false);
  const toast = useToast();

  function reset() {
    setPlanWhat("");
    setPlanWhen("");
    setPlanWhereWho("");
    setDidExecute(null);
    setEmotionBefore("");
    setEmotionAfter("");
    setReflection("");
  }

  async function handleSave() {
    if (!planWhat.trim() || !mode) {
      toast.show("'무엇을' 항목은 꼭 적어주세요", "error");
      return;
    }
    setSaving(true);
    const r = await logExercise({
      mode,
      title: planWhat.trim(),
      payload: {
        plan: {
          what: planWhat.trim(),
          when: planWhen.trim() || undefined,
          whereWho: planWhereWho.trim() || undefined,
        },
        execution:
          didExecute === null
            ? undefined
            : {
                did: didExecute,
                before: emotionBefore ? Number(emotionBefore) : undefined,
                after: emotionAfter ? Number(emotionAfter) : undefined,
              },
        reflection: reflection.trim() || undefined,
      },
    });
    setSaving(false);
    if (!r.ok) {
      toast.show(r.error, "error");
      return;
    }
    toast.show("기록이 저장되었습니다. 성장방에서 다시 볼 수 있어요.", "success");
    reset();
  }

  if (!mode) {
    return (
      <PageFade>
        {/* ── HERO ── */}
        <section className="bg-gs-navy-50 py-12 md:py-16">
          <div className="mx-auto w-full max-w-[1120px] px-4">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <FadeIn delay={0} y={16}>
                <div className="text-sm font-bold tracking-[-0.01em] text-gs-navy-bright mb-3">
                  행동연습장
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-gs-navy leading-[1.15]">
                  용기 한 걸음 🎯
                </h1>
                <p className="mt-4 md:mt-5 text-base md:text-lg text-gs-muted-soft leading-relaxed">
                  작은 행동 하나가 가장 강력한 무기예요.
                  <br className="hidden md:block" />
                  <b className="text-gs-text-strong">계획 → 실행 → 회고</b>로 한 걸음씩 기록해봐요.
                </p>
              </FadeIn>

              <FadeIn delay={0.1} y={16} className="hidden lg:flex items-center justify-center">
                <Image
                  src="/illustrations/exercise-courage.svg"
                  alt=""
                  width={260}
                  height={260}
                  className="w-[220px] xl:w-[260px] h-auto"
                />
              </FadeIn>
            </div>
          </div>
        </section>

        <main className="max-w-[1120px] mx-auto px-4 pt-8 md:pt-10 pb-24">
          <StaggerList stagger={0.1} className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <StaggerItem>
              <button
                type="button"
                onClick={() => setMode("courage")}
                className="w-full p-6 rounded-toss-card border-2 border-gs-line-soft bg-white text-left hover:border-gs-navy-bright hover:-translate-y-1 hover:shadow-toss-card-hover transition-all shadow-toss-card cursor-pointer"
              >
                <h2 className="text-xl font-extrabold tracking-[-0.02em] mb-2">
                  용기있는 행동
                </h2>
                <p className="text-sm text-gs-muted leading-[1.6]">
                  우울할 때, 작은 활동 하나가 가장 강력한 무기입니다.
                  <br />
                  계획 → 실행 → 회고로 한 걸음씩 기록해요.
                </p>
              </button>
            </StaggerItem>
            <StaggerItem>
              <button
                type="button"
                onClick={() => setMode("exposure")}
                className="w-full p-6 rounded-toss-card border-2 border-gs-line-soft bg-white text-left hover:border-gs-navy-bright hover:-translate-y-1 hover:shadow-toss-card-hover transition-all shadow-toss-card cursor-pointer"
              >
                <h2 className="text-xl font-extrabold tracking-[-0.02em] mb-2">불안노출</h2>
                <p className="text-sm text-gs-muted leading-[1.6]">
                  불안한 상황에 조금씩 노출하면 뇌가 &quot;안전하다&quot;는 걸 학습합니다.
                  <br />
                  가장 쉬운 것부터 계획·실행·회고.
                </p>
              </button>
            </StaggerItem>
          </StaggerList>
        </main>
      </PageFade>
    );
  }

  const isCourage = mode === "courage";
  const labelInputClass =
    "w-full px-3 py-2 border border-gs-line-soft rounded-toss-button text-sm outline-none focus:border-gs-navy-bright focus:ring-2 focus:ring-gs-navy-bright/20 transition-colors";

  return (
    <PageFade>
      <main className="max-w-[1120px] mx-auto px-4 pt-8 md:pt-10 pb-24">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => {
              setMode(null);
              reset();
            }}
            className="text-gs-muted hover:text-gs-text-strong text-sm"
          >
            ← 뒤로
          </button>
          <PageTitle className="text-xl md:text-2xl">
            {isCourage ? "용기있는 행동" : "불안노출 연습"}
          </PageTitle>
        </div>

      {/* 1단계 — 계획 */}
      <Card className="shadow-toss-card">
        <CardTitle>① 계획</CardTitle>
        <CardDescription>
          {isCourage
            ? "오늘 해볼 작은 행동을 계획해요. 2~10분이면 충분."
            : "노출 순위표에서 가장 쉬운 1개를 골라 계획해요."}
        </CardDescription>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
              무엇을 <span className="text-gs-danger">*</span>
            </label>
            <input
              type="text"
              value={planWhat}
              onChange={(e) => setPlanWhat(e.target.value)}
              placeholder={isCourage ? "예) 5분 산책, 설거지" : "예) 엘리베이터 타기"}
              className={labelInputClass}
              data-testid="plan-what"
            />
          </div>
          <div>
            <label className="text-[13px] font-bold text-gs-text-soft block mb-1">언제</label>
            <input
              type="text"
              value={planWhen}
              onChange={(e) => setPlanWhen(e.target.value)}
              placeholder="예) 점심 먹고 오후 2시쯤"
              className={labelInputClass}
            />
          </div>
          <div>
            <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
              어디서 / 누구와
            </label>
            <input
              type="text"
              value={planWhereWho}
              onChange={(e) => setPlanWhereWho(e.target.value)}
              placeholder="예) 집 앞 공원, 혼자"
              className={labelInputClass}
            />
          </div>
        </div>
      </Card>

      {/* 2단계 — 실행 */}
      <Card className="mt-4 shadow-toss-card">
        <CardTitle>② 실행</CardTitle>
        <CardDescription>실행한 후 기록해요. 안 했어도 OK — 솔직하게.</CardDescription>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
              실제로 했나요?
            </label>
            <div className="flex gap-2">
              {[
                { val: true, label: "✓ 했어요" },
                { val: false, label: "✕ 못 했어요" },
              ].map((opt) => (
                <button
                  key={String(opt.val)}
                  type="button"
                  onClick={() => setDidExecute(opt.val)}
                  className={`flex-1 py-2 rounded-[12px] text-sm font-bold border transition-colors ${
                    didExecute === opt.val
                      ? "bg-gs-blue text-white border-gs-blue"
                      : "bg-white text-gs-text-soft border-gs-line-soft hover:bg-gs-surface-mid"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
                {isCourage ? "기분 (전)" : "불안 (전)"}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={emotionBefore}
                onChange={(e) => setEmotionBefore(e.target.value)}
                placeholder="0~100"
                className={labelInputClass}
              />
            </div>
            <div>
              <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
                {isCourage ? "기분 (후)" : "불안 (후)"}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={emotionAfter}
                onChange={(e) => setEmotionAfter(e.target.value)}
                placeholder="0~100"
                className={labelInputClass}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 3단계 — 회고 */}
      <Card className="mt-4 shadow-toss-card">
        <CardTitle>③ 회고</CardTitle>
        <CardDescription>
          새로 알게 된 것, 다음에 시도할 것 — 짧아도 좋아요.
        </CardDescription>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="예) 막상 해보니 생각보다 괜찮았다. 다음엔 10분으로 늘려보고 싶다."
          rows={3}
          className="w-full mt-4 border border-gs-line-soft rounded-toss-card p-3 text-sm outline-none focus:border-gs-navy-bright focus:ring-2 focus:ring-gs-navy-bright/20 resize-y transition-colors"
        />

          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              type="button"
              disabled={saving || !planWhat.trim()}
              onClick={handleSave}
              className="border border-gs-navy-bright/35 bg-gs-navy-50 text-gs-navy-bright rounded-toss-button px-4 py-2 text-[13px] font-extrabold cursor-pointer hover:-translate-y-0.5 hover:shadow-toss-card transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중..." : "기록 저장"}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={saving}
              className="border border-gs-line-soft bg-white rounded-toss-button px-4 py-2 text-[13px] font-extrabold cursor-pointer hover:-translate-y-0.5 hover:shadow-toss-card transition-all"
            >
              초기화
            </button>
          </div>
        </Card>
      </main>
    </PageFade>
  );
}
