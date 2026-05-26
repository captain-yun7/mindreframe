"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Card, CardTitle, CardDescription } from "@/components/card";
import { logExercise } from "@/lib/actions/exercise";
import { useToast } from "@/components/ui/toast";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerList, StaggerItem } from "@/components/motion/stagger-list";
import {
  ANXIETY_EXAMPLES,
  DEPRESS_EXAMPLES,
  buildAnxRows,
  buildDepRows,
  type AnxietyPlanItem,
  type DepressPlanItem,
  type ExerciseMode,
} from "@/lib/exercise-payload";
import { AnxietyPlanTable } from "./anxiety-plan-table";
import { DepressPlanTable } from "./depress-plan-table";
import { ExampleAccordion } from "./example-accordion";

const labelInputClass =
  "w-full px-3 py-2 border border-gs-line-soft rounded-toss-button text-sm outline-none focus:border-gs-navy-bright focus:ring-2 focus:ring-gs-navy-bright/20 transition-colors";

// localStorage 키 — 원본과 호환 유지
const KEY_MODE = "ws_mode";
const KEY_DRAFT_A = "ws_draft_anxiety";
const KEY_DRAFT_D = "ws_draft_depress";
const KEY_PLAN_A = "ws_plan_anxiety";
const KEY_PLAN_D = "ws_plan_depress";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export default function ExercisePage() {
  const [mode, setMode] = useState<ExerciseMode | null>(null);
  const [anxRows, setAnxRows] = useState<AnxietyPlanItem[]>(buildAnxRows);
  const [depRows, setDepRows] = useState<DepressPlanItem[]>(buildDepRows);
  const [anxSaved, setAnxSaved] = useState(false);
  const [depSaved, setDepSaved] = useState(false);
  const [anxSelectedIdx, setAnxSelectedIdx] = useState<number | null>(null);
  const [depSelectedIdx, setDepSelectedIdx] = useState<number | null>(null);
  const [step4Open, setStep4Open] = useState(false);

  // 4단계 폼 — 불안
  const [anxDid, setAnxDid] = useState<"did" | "no">("did");
  const [anxBefore, setAnxBefore] = useState("");
  const [anxAfter, setAnxAfter] = useState("");
  const [anxLearned, setAnxLearned] = useState("");
  const [anxUnexpected, setAnxUnexpected] = useState("");

  // 4단계 폼 — 우울
  const [depDid, setDepDid] = useState<"did" | "no">("did");
  const [depAfterMood, setDepAfterMood] = useState("");
  const [depLearned, setDepLearned] = useState("");
  const [depUnexpected, setDepUnexpected] = useState("");

  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 초기 로드 — localStorage 복원 (hydration 후 브라우저 측 동기화)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const savedMode = safeRead<ExerciseMode | null>(KEY_MODE, null);
    if (savedMode === "anxiety" || savedMode === "depress") setMode(savedMode);

    const draftA = safeRead<{ rows?: AnxietyPlanItem[] }>(KEY_DRAFT_A, {});
    const planA = safeRead<{ items?: AnxietyPlanItem[] } | null>(KEY_PLAN_A, null);

    if (draftA?.rows && Array.isArray(draftA.rows)) {
      const r = buildAnxRows();
      draftA.rows.slice(0, 10).forEach((row, i) => {
        r[i] = {
          situation: row.situation ?? "",
          expected: row.expected ?? "",
          rank: row.rank ?? "",
          auto: row.auto ?? "",
          rational: row.rational ?? "",
        };
      });
      setAnxRows(r);
    } else if (planA?.items) {
      const r = buildAnxRows();
      planA.items.slice(0, 10).forEach((row, i) => {
        r[i] = {
          situation: row.situation ?? "",
          expected: row.expected ?? "",
          rank: row.rank ?? "",
          auto: row.auto ?? "",
          rational: row.rational ?? "",
        };
      });
      setAnxRows(r);
      setAnxSaved(true);
    }

    const draftD = safeRead<{ rows?: DepressPlanItem[] }>(KEY_DRAFT_D, {});
    const planD = safeRead<{ items?: DepressPlanItem[] } | null>(KEY_PLAN_D, null);

    if (draftD?.rows && Array.isArray(draftD.rows)) {
      const r = buildDepRows();
      draftD.rows.slice(0, 10).forEach((row, i) => {
        r[i] = {
          activity: row.activity ?? "",
          diff: row.diff ?? "",
          memo: row.memo ?? "",
        };
      });
      setDepRows(r);
    } else if (planD?.items) {
      const r = buildDepRows();
      planD.items.slice(0, 10).forEach((row, i) => {
        r[i] = {
          activity: row.activity ?? "",
          diff: row.diff ?? "",
          memo: row.memo ?? "",
        };
      });
      setDepRows(r);
      setDepSaved(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 자동 저장 (180ms debounce) — draft만, plan은 명시적 버튼
  useEffect(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      safeWrite(KEY_DRAFT_A, { rows: anxRows });
    }, 180);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [anxRows]);

  useEffect(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      safeWrite(KEY_DRAFT_D, { rows: depRows });
    }, 180);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [depRows]);

  function pickMode(m: ExerciseMode) {
    setMode(m);
    safeWrite(KEY_MODE, m);
  }

  function backToStep1() {
    setMode(null);
    safeWrite(KEY_MODE, null);
    setStep4Open(false);
  }

  function onAnxRowChange(idx: number, key: keyof AnxietyPlanItem, value: string) {
    setAnxRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }

  function onDepRowChange(idx: number, key: keyof DepressPlanItem, value: string) {
    setDepRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }

  function onAnxRowClear(idx: number) {
    setAnxRows((rows) =>
      rows.map((r, i) =>
        i === idx ? { situation: "", expected: "", rank: "", auto: "", rational: "" } : r,
      ),
    );
    if (anxSelectedIdx === idx) setAnxSelectedIdx(null);
  }

  function onDepRowClear(idx: number) {
    setDepRows((rows) =>
      rows.map((r, i) => (i === idx ? { activity: "", diff: "", memo: "" } : r)),
    );
    if (depSelectedIdx === idx) setDepSelectedIdx(null);
  }

  function fillNextEmptyAnx(text: string) {
    setAnxRows((rows) => {
      const idx = rows.findIndex((r) => !r.situation.trim());
      const target = idx === -1 ? 9 : idx;
      return rows.map((r, i) => (i === target ? { ...r, situation: text } : r));
    });
  }

  function fillNextEmptyDep(text: string) {
    setDepRows((rows) => {
      const idx = rows.findIndex((r) => !r.activity.trim());
      const target = idx === -1 ? 9 : idx;
      return rows.map((r, i) => (i === target ? { ...r, activity: text } : r));
    });
  }

  function saveAnxPlan() {
    const items = anxRows
      .filter((r) => r.situation.trim())
      .sort((a, b) => {
        const ra = parseInt(a.rank, 10);
        const rb = parseInt(b.rank, 10);
        if (Number.isNaN(ra) && Number.isNaN(rb)) return 0;
        if (Number.isNaN(ra)) return 1;
        if (Number.isNaN(rb)) return -1;
        return ra - rb;
      });
    if (items.length === 0) {
      toast.show("적어도 1개 상황은 입력해주세요", "error");
      return;
    }
    const padded = buildAnxRows();
    items.slice(0, 10).forEach((it, i) => {
      padded[i] = it;
    });
    setAnxRows(padded);
    safeWrite(KEY_PLAN_A, { savedAt: new Date().toISOString(), items });
    setAnxSaved(true);
    setStep4Open(false);
    toast.show("2단계가 저장되었어요. 3단계에서 1개를 골라주세요.", "success");
  }

  function saveDepPlan() {
    const items = depRows.filter((r) => r.activity.trim());
    if (items.length === 0) {
      toast.show("적어도 1개 활동은 입력해주세요", "error");
      return;
    }
    safeWrite(KEY_PLAN_D, { savedAt: new Date().toISOString(), items });
    setDepSaved(true);
    setStep4Open(false);
    toast.show("2단계가 저장되었어요. 3단계에서 1개를 골라주세요.", "success");
  }

  async function saveAnxRecord() {
    if (anxSelectedIdx === null) {
      toast.show("3단계에서 도전할 상황을 선택해주세요", "error");
      return;
    }
    const row = anxRows[anxSelectedIdx];
    if (!anxBefore || !anxAfter || !anxLearned.trim()) {
      toast.show("필수 항목을 모두 채워주세요", "error");
      return;
    }
    setSaving(true);
    const r = await logExercise({
      mode: "anxiety",
      title: row.situation || "(상황 없음)",
      payload: {
        type: "anxiety_exposure",
        mode: "anxiety",
        situation: row.situation,
        expectedAnxiety: row.expected ? Number(row.expected) : null,
        avoidRank: row.rank ? Number(row.rank) : null,
        autoThought: row.auto,
        rationalThought: row.rational,
        did: anxDid,
        actualBefore: Number(anxBefore),
        actualAfter: Number(anxAfter),
        learnedLine: anxLearned.trim(),
        unexpectedThought: anxUnexpected.trim() || undefined,
      },
    });
    setSaving(false);
    if (!r.ok) {
      toast.show(r.error, "error");
      return;
    }
    toast.show("오늘 기록이 저장되었어요. 대단해요!", "success");
    setAnxDid("did");
    setAnxBefore("");
    setAnxAfter("");
    setAnxLearned("");
    setAnxUnexpected("");
    setStep4Open(false);
  }

  async function saveDepRecord() {
    if (depSelectedIdx === null) {
      toast.show("3단계에서 활동을 선택해주세요", "error");
      return;
    }
    const row = depRows[depSelectedIdx];
    if (!depAfterMood || !depLearned.trim()) {
      toast.show("필수 항목을 모두 채워주세요", "error");
      return;
    }
    setSaving(true);
    const r = await logExercise({
      mode: "depress",
      title: row.activity || "(활동 없음)",
      payload: {
        type: "depress_activity",
        mode: "depress",
        activity: row.activity,
        diff: row.diff ? Number(row.diff) : null,
        did: depDid,
        actualAfter: Number(depAfterMood),
        learnedLine: depLearned.trim(),
        unexpectedThought: depUnexpected.trim() || undefined,
      },
    });
    setSaving(false);
    if (!r.ok) {
      toast.show(r.error, "error");
      return;
    }
    toast.show("오늘 기록이 저장되었어요. 멋져요!", "success");
    setDepDid("did");
    setDepAfterMood("");
    setDepLearned("");
    setDepUnexpected("");
    setStep4Open(false);
  }

  /* ── 1단계: 모드 선택 ── */
  if (!mode) {
    return (
      <PageFade>
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
                  <b className="text-gs-text-strong">계획 → 선택 → 도전 → 기록</b>으로 한 걸음씩.
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
          <h2 className="text-xl font-extrabold text-gs-text-strong mb-4">
            1단계) 어떤 연습을 할까요?
          </h2>
          <StaggerList stagger={0.1} className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <StaggerItem>
              <button
                type="button"
                onClick={() => pickMode("anxiety")}
                className="w-full p-6 rounded-toss-card border-2 border-gs-line-soft bg-white text-left hover:border-gs-navy-bright hover:-translate-y-1 hover:shadow-toss-card-hover transition-all shadow-toss-card cursor-pointer"
              >
                <h3 className="text-xl font-extrabold tracking-[-0.02em] mb-2">
                  불안 줄이기 연습
                </h3>
                <p className="text-sm text-gs-muted leading-[1.6]">
                  피해왔던 상황의 순위를 정해, 쉬운 것부터 단계적으로 도전합니다.
                  <br />
                  뇌가 &quot;안전하다&quot;를 학습할수록 불안이 점점 줄어듭니다.
                </p>
              </button>
            </StaggerItem>
            <StaggerItem>
              <button
                type="button"
                onClick={() => pickMode("depress")}
                className="w-full p-6 rounded-toss-card border-2 border-gs-line-soft bg-white text-left hover:border-gs-navy-bright hover:-translate-y-1 hover:shadow-toss-card-hover transition-all shadow-toss-card cursor-pointer"
              >
                <h3 className="text-xl font-extrabold tracking-[-0.02em] mb-2">
                  우울 벗어나기 연습
                </h3>
                <p className="text-sm text-gs-muted leading-[1.6]">
                  &quot;기분이 좋아져야 움직이는 것&quot;이 아니라, 작은 행동이 기분을 깨웁니다.
                  <br />
                  3~10분짜리 활동부터 시작해봐요.
                </p>
              </button>
            </StaggerItem>
          </StaggerList>
        </main>
      </PageFade>
    );
  }

  const isAnxiety = mode === "anxiety";
  const planSaved = isAnxiety ? anxSaved : depSaved;
  const selectedIdx = isAnxiety ? anxSelectedIdx : depSelectedIdx;
  const selectedRow =
    selectedIdx !== null
      ? isAnxiety
        ? anxRows[selectedIdx]
        : depRows[selectedIdx]
      : null;

  return (
    <PageFade>
      <main className="max-w-[1120px] mx-auto px-4 pt-8 md:pt-10 pb-24">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={backToStep1}
            className="text-gs-muted hover:text-gs-text-strong text-sm"
          >
            ← 뒤로
          </button>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-[-0.02em] text-gs-navy">
            {isAnxiety ? "불안 줄이기 연습" : "우울 벗어나기 연습"}
          </h1>
        </div>

        {/* 2단계 — 계획 표 */}
        <Card className="shadow-toss-card">
          <CardTitle>{isAnxiety ? "2단계) 불안 목록 만들기" : "2단계) 활동 목록 만들기"}</CardTitle>
          <CardDescription>
            {isAnxiety
              ? "두렵거나 피해왔던 상황 10개와, 그동안 얼마나 피했는지 '피한 순위'를 매겨주세요. 자동/합리적 사고는 나중에 채워도 돼요."
              : "거창한 목표보다 아주 작은 활동이 핵심이에요. 3~10분짜리도 충분합니다."}
          </CardDescription>

          <div className="mt-4">
            {isAnxiety ? (
              <AnxietyPlanTable
                rows={anxRows}
                selectedIndex={anxSelectedIdx}
                onChange={onAnxRowChange}
                onSelect={(i) => setAnxSelectedIdx(i)}
                onClear={onAnxRowClear}
              />
            ) : (
              <DepressPlanTable
                rows={depRows}
                selectedIndex={depSelectedIdx}
                onChange={onDepRowChange}
                onSelect={(i) => setDepSelectedIdx(i)}
                onClear={onDepRowClear}
              />
            )}
          </div>

          <div className="mt-4 flex gap-2 flex-wrap items-center">
            <button
              type="button"
              onClick={isAnxiety ? saveAnxPlan : saveDepPlan}
              className="border border-gs-navy-bright/35 bg-gs-navy-50 text-gs-navy-bright rounded-toss-button px-4 py-2 text-[13px] font-extrabold cursor-pointer hover:-translate-y-0.5 hover:shadow-toss-card transition-all"
            >
              2단계 저장
            </button>
            <span className="text-xs text-gs-muted-light">작성 중 자동 저장됩니다</span>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-bold text-gs-text-strong mb-2">
              {isAnxiety ? "상황 예시 (클릭하면 표에 추가)" : "활동 예시 (클릭하면 표에 추가)"}
            </h3>
            <ExampleAccordion
              groups={isAnxiety ? ANXIETY_EXAMPLES : DEPRESS_EXAMPLES}
              onPick={isAnxiety ? fillNextEmptyAnx : fillNextEmptyDep}
            />
          </div>
        </Card>

        {/* 3단계 — 선택된 상황/활동 */}
        {planSaved && (
          <Card className="mt-4 shadow-toss-card">
            <CardTitle>
              {isAnxiety ? "3단계) 오늘 도전할 상황 1개 선택" : "3단계) 오늘 할 활동 1개 선택"}
            </CardTitle>
            <CardDescription>
              {isAnxiety
                ? "2단계 표에서 라디오를 체크하면 여기 표시됩니다. 너무 어려운 단계부터 시작하지 말고, 피한 순위가 낮은 것부터 시작하세요."
                : "2단계 표에서 라디오를 체크하면 여기 표시됩니다."}
            </CardDescription>

            {selectedRow === null ? (
              <div className="mt-4 p-4 rounded-[12px] bg-gs-surface-muted text-center text-sm text-gs-muted">
                아직 선택된 {isAnxiety ? "상황" : "활동"}이 없어요.
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-[12px] bg-gs-navy-50/60 border border-gs-navy-bright/20 space-y-2 text-sm">
                {isAnxiety && "situation" in selectedRow && (
                  <>
                    <div>
                      <span className="font-bold text-gs-navy-bright">상황 · </span>
                      {selectedRow.situation}
                    </div>
                    <div>
                      <span className="font-bold text-gs-navy-bright">불안(예상) · </span>
                      {selectedRow.expected || "—"}
                    </div>
                    <div>
                      <span className="font-bold text-gs-navy-bright">피한 순위 · </span>
                      {selectedRow.rank || "—"}
                    </div>
                    <div>
                      <span className="font-bold text-gs-navy-bright">자동사고 · </span>
                      {selectedRow.auto || "—"}
                    </div>
                    <div>
                      <span className="font-bold text-gs-navy-bright">합리적 사고 · </span>
                      {selectedRow.rational || "—"}
                    </div>
                  </>
                )}
                {!isAnxiety && "activity" in selectedRow && (
                  <>
                    <div>
                      <span className="font-bold text-gs-navy-bright">활동 · </span>
                      {selectedRow.activity}
                    </div>
                    <div>
                      <span className="font-bold text-gs-navy-bright">실행 난이도 · </span>
                      {selectedRow.diff || "—"}
                    </div>
                  </>
                )}

                <div className="mt-3 pt-3 border-t border-gs-navy-bright/15 text-[12.5px] text-gs-text-soft leading-[1.7]">
                  {isAnxiety ? (
                    <>
                      오늘의 목적은 용기내어 선택한 상황에 도전하는 거예요.
                      <br />
                      &quot;완벽하게&quot;가 아니라 불안한 상황에서{" "}
                      <b className="text-gs-text-strong">합리적 사고를 사용해보는 것</b>이에요.
                      떨려도 괜찮아요.
                      <br />
                      <b>자! 합리적 사고를 되뇌이면서 도전!!</b>
                    </>
                  ) : (
                    <>
                      오늘의 목적은 &quot;완벽&quot;이 아니라{" "}
                      <b className="text-gs-text-strong">작게라도 실행해보는 것</b>이에요.
                      <br />
                      했다는 사실이 자기효능감을 깨우는 강력한 신호가 됩니다.
                    </>
                  )}
                </div>

                {!step4Open && (
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setStep4Open(true)}
                      className="border border-gs-navy-bright/35 bg-gs-navy-bright text-white rounded-toss-button px-6 py-2.5 text-sm font-extrabold cursor-pointer hover:-translate-y-0.5 hover:shadow-toss-card-hover transition-all"
                    >
                      4단계 펼치기
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* 4단계 — 도전 기록 */}
        {planSaved && selectedRow && step4Open && (
          <Card className="mt-4 shadow-toss-card">
            <CardTitle>{isAnxiety ? "4단계) 도전 기록(오늘)" : "4단계) 활동 기록(오늘)"}</CardTitle>
            <CardDescription>
              {isAnxiety
                ? "한 번 해보고 끝내지 않아요. 같은 단계를 여러 번 반복할수록 뇌가 '위험하지 않다'고 학습합니다."
                : "작아 보여도 실행한 사실이 가장 큰 성과예요."}
            </CardDescription>

            {isAnxiety && "situation" in selectedRow ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
                    선택된 상황
                  </label>
                  <input
                    type="text"
                    value={selectedRow.situation}
                    readOnly
                    className={`${labelInputClass} bg-gs-surface-muted`}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
                    해봤나요? <span className="text-gs-danger">*</span>
                  </label>
                  <select
                    value={anxDid}
                    onChange={(e) => setAnxDid(e.target.value as "did" | "no")}
                    className={labelInputClass}
                  >
                    <option value="did">했다</option>
                    <option value="no">못했다</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
                      불안(실제) 전 <span className="text-gs-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={anxBefore}
                      onChange={(e) => setAnxBefore(e.target.value)}
                      placeholder="0~100"
                      className={labelInputClass}
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
                      불안(실제) 후 <span className="text-gs-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={anxAfter}
                      onChange={(e) => setAnxAfter(e.target.value)}
                      placeholder="0~100"
                      className={labelInputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
                    배운 점 한 줄 <span className="text-gs-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={anxLearned}
                    onChange={(e) => setAnxLearned(e.target.value)}
                    placeholder="예) 생각만큼 최악은 아니었다"
                    className={labelInputClass}
                  />
                  <p className="mt-1 text-[11.5px] text-gs-warning bg-gs-warning-bg px-2 py-1 rounded-[8px]">
                    ⚠ 장점무시하기 주의! 결과가 아쉬워도, 시도한 사실 자체가 성장이에요.
                  </p>
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
                    예상치 못했던 생각 (선택)
                  </label>
                  <textarea
                    value={anxUnexpected}
                    onChange={(e) => setAnxUnexpected(e.target.value)}
                    rows={2}
                    placeholder="예) 얼굴이 빨개질까 봐 더 긴장했다"
                    className={`${labelInputClass} resize-y`}
                  />
                </div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveAnxRecord}
                    className="border border-gs-navy-bright/35 bg-gs-navy-bright text-white rounded-toss-button px-4 py-2 text-[13px] font-extrabold cursor-pointer hover:-translate-y-0.5 hover:shadow-toss-card-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "저장 중..." : "오늘 기록 저장"}
                  </button>
                </div>
              </div>
            ) : !isAnxiety && "activity" in selectedRow ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
                    선택된 활동
                  </label>
                  <input
                    type="text"
                    value={selectedRow.activity}
                    readOnly
                    className={`${labelInputClass} bg-gs-surface-muted`}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
                    해봤나요? <span className="text-gs-danger">*</span>
                  </label>
                  <select
                    value={depDid}
                    onChange={(e) => setDepDid(e.target.value as "did" | "no")}
                    className={labelInputClass}
                  >
                    <option value="did">했다</option>
                    <option value="no">못했다</option>
                  </select>
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
                    활동 후 기분 (좋을수록 100) <span className="text-gs-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={depAfterMood}
                    onChange={(e) => setDepAfterMood(e.target.value)}
                    placeholder="0~100"
                    className={labelInputClass}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
                    배운 점 한 줄 <span className="text-gs-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={depLearned}
                    onChange={(e) => setDepLearned(e.target.value)}
                    placeholder="예) 5분이라도 하니까 조금 숨이 트였다"
                    className={labelInputClass}
                  />
                  <p className="mt-1 text-[11.5px] text-gs-warning bg-gs-warning-bg px-2 py-1 rounded-[8px]">
                    ⚠ 장점무시하기 주의! 작아 보여도, 실행한 사실이 가장 큰 성과예요.
                  </p>
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gs-text-soft block mb-1">
                    예상치 못했던 생각 (선택)
                  </label>
                  <textarea
                    value={depUnexpected}
                    onChange={(e) => setDepUnexpected(e.target.value)}
                    rows={2}
                    placeholder="예) 해도 소용없을 것 같다는 생각이 들었다"
                    className={`${labelInputClass} resize-y`}
                  />
                </div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveDepRecord}
                    className="border border-gs-navy-bright/35 bg-gs-navy-bright text-white rounded-toss-button px-4 py-2 text-[13px] font-extrabold cursor-pointer hover:-translate-y-0.5 hover:shadow-toss-card-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "저장 중..." : "오늘 기록 저장"}
                  </button>
                </div>
              </div>
            ) : null}
          </Card>
        )}
      </main>
    </PageFade>
  );
}
