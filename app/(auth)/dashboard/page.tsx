"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardTitle, CardDescription } from "@/components/card";
import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { ChecklistItem } from "@/components/routine/checklist-item";
import { MoodSlider } from "@/components/routine/mood-slider";
import { RoutineSidebar } from "@/components/routine/sidebar";
import {
  saveEmotionScore,
  saveGratitudeEntry,
  toggleRoutineCheck,
  loadTodayDashboard,
} from "@/lib/actions/dashboard";
import { useToast } from "@/components/ui/toast";

const checklistItems = [
  {
    key: "mood",
    label: "감정 점수 체크",
    description: "슬라이더를 한 번 움직이면 완료로 처리돼요.",
    actionLabel: "보기",
    ghost: true,
  },
  {
    key: "trash",
    label: "생각쓰레기통 작성하기",
    description: "지금 마음속 생각/감정을 한 줄만 적기.",
    actionLabel: "작성",
    actionHref: "/trash",
  },
  {
    key: "analysis",
    label: "가짜생각 분석 1회",
    description: "자동사고 → 인지왜곡 → 한 문장 정리.",
    actionLabel: "분석",
    actionHref: "/chat",
  },
  {
    key: "focus3",
    label: "3분 집중",
    description: "호흡/소리/한 문장에 주의 옮기기.",
    actionLabel: "명상",
    actionHref: "/meditation",
  },
  {
    key: "gratitude",
    label: "감사 1가지",
    description: "없어도 '억지로' 하나 만들기.",
    actionLabel: "쓰기",
    ghost: false,
  },
  {
    key: "courage",
    label: "행동 1개",
    description: "작게라도 '원하는 방향'으로 한 걸음.",
    actionLabel: "열기",
    actionHref: "/exercise",
    ghost: true,
  },
];

export default function DashboardPage() {
  const [moodScore, setMoodScore] = useState(50);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [gratitudeText, setGratitudeText] = useState("");
  const gratitudeRef = useRef<HTMLTextAreaElement>(null);
  const moodDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  // 체크리스트 토글 → DB 저장
  function handleCheck(key: string, checked: boolean) {
    setChecks((prev) => ({ ...prev, [key]: checked }));
    if (key === "mood") return; // mood는 별도 처리
    toggleRoutineCheck(key, checked).then((r) => {
      if (!r.ok) toast.show(r.error, "error");
    });
  }

  // 감정 점수 슬라이더 → 디바운스 후 DB upsert
  function handleMoodChange(value: number) {
    setMoodScore(value);
    setChecks((prev) => ({ ...prev, mood: true }));
    if (moodDebounce.current) clearTimeout(moodDebounce.current);
    moodDebounce.current = setTimeout(() => {
      saveEmotionScore(value).then((r) => {
        if (!r.ok) toast.show(r.error, "error");
      });
    }, 600);
  }

  // 진입 시 오늘 데이터 로드
  useEffect(() => {
    let cancelled = false;
    loadTodayDashboard().then((r) => {
      if (cancelled || !r.ok) return;
      if (r.moodScore != null) setMoodScore(r.moodScore);
      const initial: Record<string, boolean> = {};
      r.checkedKeys.forEach((k) => {
        initial[k] = true;
      });
      if (r.gratitudeDone) initial.gratitude = true;
      if (r.moodScore != null) initial.mood = true;
      setChecks(initial);
    });
    return () => {
      cancelled = true;
      if (moodDebounce.current) clearTimeout(moodDebounce.current);
    };
  }, []);

  const totalChecks = checklistItems.length;
  const doneChecks = Object.values(checks).filter(Boolean).length;
  const completionRate =
    totalChecks > 0 ? `${Math.round((doneChecks / totalChecks) * 100)}%` : "0%";

  return (
    <PageLayout>
      <PageTitle>오늘의 루틴</PageTitle>
      <PageLead>오늘도 1%만 해도 충분해요.</PageLead>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_320px] gap-4 items-start max-lg:grid-cols-1">
        {/* LEFT */}
        <div>
          {/* 감정 점수 */}
          <Card>
            <CardTitle>1) 오늘 감정 점수</CardTitle>
            <CardDescription>
              0은 아주 괜찮음, 100은 매우 힘듦. 오늘 &quot;지금&quot; 기준으로 체크해요.
            </CardDescription>
            <MoodSlider value={moodScore} onChange={handleMoodChange} />
          </Card>

          {/* 체크리스트 */}
          <Card className="mt-4">
            <CardTitle>2) 오늘 체크리스트</CardTitle>
            <CardDescription>
              짧고 가볍게. &quot;완벽&quot;이 아니라 &quot;완료&quot;가 목표예요.
            </CardDescription>

            <div className="mt-4 grid gap-2">
              {checklistItems.map((item) => (
                <ChecklistItem
                  key={item.key}
                  itemKey={item.key}
                  label={item.label}
                  description={item.description}
                  checked={checks[item.key] || false}
                  onCheck={
                    item.key === "gratitude"
                      ? () => {
                          gratitudeRef.current?.focus();
                          gratitudeRef.current?.scrollIntoView({
                            behavior: "smooth",
                          });
                        }
                      : item.key === "mood"
                        ? () => {}
                        : handleCheck
                  }
                  actionLabel={item.actionLabel}
                  actionHref={item.actionHref}
                  actionOnClick={
                    item.key === "gratitude"
                      ? () => {
                          gratitudeRef.current?.focus();
                          gratitudeRef.current?.scrollIntoView({
                            behavior: "smooth",
                          });
                        }
                      : undefined
                  }
                  ghost={item.ghost}
                />
              ))}
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setChecks({})}
                className="border border-gs-line-soft bg-white rounded-xl px-3 py-2 text-[13px] font-[950] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-gs-card"
              >
                오늘 체크 초기화
              </button>
              <a
                href="/progress"
                className="border border-gs-blue/35 bg-gs-blue-light text-gs-blue rounded-xl px-3 py-2 text-[13px] font-[950] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-gs-card"
              >
                → 나의성장방에서 보기
              </a>
            </div>
          </Card>

          {/* 감사일기 */}
          <Card className="mt-4 scroll-mt-28" id="gratitudeCard">
            <CardTitle>감사일기</CardTitle>
            <CardDescription>
              오늘의 감사 한 줄. 저장하면 성장방에 날짜별로 쌓입니다.
            </CardDescription>
            <textarea
              ref={gratitudeRef}
              value={gratitudeText}
              onChange={(e) => setGratitudeText(e.target.value)}
              placeholder={
                "예) 오늘은 내가 포기하지 않은 게 고맙다.\n예) 따뜻한 말 한마디가 고마웠다."
              }
              className="w-full mt-4 border border-gs-line-soft rounded-[14px] p-3 min-h-[120px] resize-y outline-none bg-white focus:border-gs-blue focus:ring-2 focus:ring-gs-blue/20"
            />
            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={async () => {
                  const trimmed = gratitudeText.trim();
                  if (!trimmed) return;
                  const r = await saveGratitudeEntry(trimmed);
                  if (!r.ok) {
                    toast.show(r.error, "error");
                    return;
                  }
                  setChecks((prev) => ({ ...prev, gratitude: true }));
                  setGratitudeText("");
                  toast.show("감사일기가 저장되었습니다", "success");
                }}
                className="border border-gs-blue/35 bg-gs-blue-light text-gs-blue rounded-xl px-3 py-2 text-[13px] font-[950] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-gs-card"
              >
                감사일기 저장
              </button>
              <button
                type="button"
                onClick={() => setGratitudeText("")}
                className="border border-gs-line-soft bg-white rounded-xl px-3 py-2 text-[13px] font-[950] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-gs-card"
              >
                내용 지우기
              </button>
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <RoutineSidebar
          moodScore={moodScore}
          completionRate={completionRate}
          streak={0}
          totalDays={1}
          hint="혼합형은 '하나만 선택'이 승리예요. 오늘은 1개만 해도 OK."
        />
      </div>
    </PageLayout>
  );
}
