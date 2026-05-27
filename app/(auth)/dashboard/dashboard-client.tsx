"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card, CardTitle, CardDescription } from "@/components/card";
import { ChecklistItem } from "@/components/routine/checklist-item";
import { MoodSlider } from "@/components/routine/mood-slider";
import { RoutineSidebar } from "@/components/routine/sidebar";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerList, StaggerItem } from "@/components/motion/stagger-list";
import { PageFade } from "@/components/motion/page-fade";
import {
  saveEmotionScore,
  saveGratitudeEntry,
  toggleRoutineCheck,
} from "@/lib/actions/dashboard";
import type { TodayDailyVideo } from "@/lib/actions/daily-video";
import { useToast } from "@/components/ui/toast";

const checklistItems = [
  {
    key: "mood",
    label: "감정 점수 체크",
    description: "슬라이더를 한 번 움직이면 완료로 처리돼요.",
    actionLabel: "보기",
    actionHref: "/progress#emotion-chart",
    ghost: true,
  },
  {
    key: "daily_video",
    label: "오늘의 영상 시청",
    description: "오늘의 영상을 보면 자동으로 체크돼요.",
    actionLabel: "재생",
    actionHref: "/study/today/play",
    ghost: false,
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

export interface DashboardInitial {
  moodScore: number | null;
  gratitudeContent: string;
  gratitudeDone: boolean;
  checkedKeys: string[];
  today: string;
  streak: number;
  totalDays: number;
  nickname?: string | null;
  todayVideo?: TodayDailyVideo;
}

export function DashboardClient({ initial }: { initial: DashboardInitial }) {
  // server에서 받은 initial로 첫 렌더부터 채워진 상태로 시작
  const initialChecks: Record<string, boolean> = {};
  initial.checkedKeys.forEach((k) => {
    initialChecks[k] = true;
  });
  if (initial.gratitudeDone) initialChecks.gratitude = true;
  if (initial.moodScore != null) initialChecks.mood = true;

  const [moodScore, setMoodScore] = useState(initial.moodScore ?? 50);
  const [checks, setChecks] = useState<Record<string, boolean>>(initialChecks);
  const [gratitudeText, setGratitudeText] = useState("");
  const [savedGratitude, setSavedGratitude] = useState<string>(initial.gratitudeContent);
  const gratitudeRef = useRef<HTMLTextAreaElement>(null);
  const moodDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  function handleCheck(key: string, checked: boolean) {
    setChecks((prev) => ({ ...prev, [key]: checked }));
    if (key === "mood") return;
    toggleRoutineCheck(key, checked).then((r) => {
      if (!r.ok) toast.show(r.error, "error");
    });
  }

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

  // 자정 갱신 (탭 포커스 시 날짜 비교)
  useEffect(() => {
    const onFocus = () => {
      const newDate = new Date().toISOString().slice(0, 10);
      if (newDate !== initial.today) {
        window.location.reload();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      if (moodDebounce.current) clearTimeout(moodDebounce.current);
    };
  }, [initial.today]);

  const totalChecks = checklistItems.length;
  const doneChecks = Object.values(checks).filter(Boolean).length;
  const completionPct =
    totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0;
  const completionRate = `${completionPct}%`;

  const dayLabel = initial.totalDays > 0 ? `${initial.totalDays}일차` : "첫 날";
  const greetName = initial.nickname ? `${initial.nickname}님, ` : "";

  return (
    <PageFade>
      {/* ── HERO (오늘의 루틴 친근 인사) ── */}
      <section className="bg-gs-navy-50 py-12 md:py-16">
        <div className="mx-auto w-full max-w-[1120px] px-4">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <FadeIn delay={0} y={16}>
              <div className="text-sm font-bold tracking-[-0.01em] text-gs-navy-bright mb-3">
                오늘의 루틴
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-gs-navy leading-[1.15]">
                {greetName}오늘은 {dayLabel}예요 🌱
              </h1>
              <p className="mt-4 md:mt-5 text-base md:text-lg text-gs-muted-soft leading-relaxed">
                작은 한 걸음이 큰 변화로 이어져요.{" "}
                <br className="hidden md:block" />
                오늘도 1%만 해도 충분해요.
              </p>

              {/* 진행률 바 */}
              <div className="mt-6 md:mt-8 max-w-[440px]">
                <div className="flex items-center justify-between text-sm font-bold mb-2">
                  <span className="text-gs-text-strong">
                    오늘 {doneChecks}/{totalChecks} 완료
                  </span>
                  <span className="text-gs-gold-700">{completionRate}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-white overflow-hidden border border-gs-line-soft">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-gs-gold to-gs-gold-700"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPct}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.1} y={16} className="hidden lg:flex items-center justify-center">
              <Image
                src="/illustrations/dashboard-routine.svg"
                alt=""
                width={260}
                height={260}
                className="w-[220px] xl:w-[260px] h-auto"
              />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── 본문 ── */}
      <main className="max-w-[1120px] mx-auto px-4 pt-8 md:pt-10 pb-24">
        <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-4 items-start max-lg:grid-cols-1">
          <div>
            {(() => {
              const v = initial.todayVideo;
              if (!v) return null;
              if (v.ok === false && v.reason !== "no_row") return null;
              const dayNumber = v.ok ? v.dayNumber : v.dayNumber;
              const title = v.ok ? v.title : `${dayNumber}일차 영상`;
              const videoUrl = v.ok ? v.videoUrl : null;
              return (
                <FadeIn>
                  <Card className="shadow-toss-card mb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gs-navy-bright">
                          {dayNumber}일차
                        </p>
                        <CardTitle className="mt-1">오늘의 영상</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {title}
                        </CardDescription>
                      </div>
                      {checks.daily_video && (
                        <span
                          data-testid="daily-video-checked"
                          className="shrink-0 text-gs-gold-700 text-xs font-bold whitespace-nowrap"
                        >
                          ✓ 시청 완료
                        </span>
                      )}
                    </div>
                    {videoUrl ? (
                      <Link
                        href="/study/today/play"
                        data-testid="dashboard-today-video-card"
                        aria-label={`${dayNumber}일차 오늘의 영상 재생`}
                        className="group relative block mt-4 aspect-video rounded-[12px] overflow-hidden bg-gradient-to-br from-gs-navy to-gs-navy-bright shadow-toss-card transition-transform hover:translate-y-[-1px] hover:shadow-toss-card-hover"
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-toss-card group-hover:bg-gs-gold transition-colors">
                            <span className="text-2xl text-gs-navy translate-x-[2px]">▶</span>
                          </div>
                        </div>
                        <div className="absolute bottom-3 left-4 right-4 text-white text-xs font-bold drop-shadow">
                          오늘의 {dayNumber}일차 영상 보기
                        </div>
                      </Link>
                    ) : (
                      <div
                        data-testid="dashboard-today-video-placeholder"
                        className="mt-4 aspect-video rounded-[12px] bg-gs-surface-muted border border-gs-line-soft flex flex-col items-center justify-center text-gs-muted"
                      >
                        <p className="text-sm font-bold">영상 준비 중입니다</p>
                        <p className="text-[11px] mt-1">
                          {dayNumber}일차 영상이 곧 업로드돼요
                        </p>
                      </div>
                    )}
                  </Card>
                </FadeIn>
              );
            })()}

            <FadeIn>
              <Card className="shadow-toss-card">
                <CardTitle>1) 오늘 감정 점수</CardTitle>
                <CardDescription>
                  0은 아주 괜찮음, 100은 매우 힘듦. 오늘 &quot;지금&quot; 기준으로 체크해요.
                </CardDescription>
                <MoodSlider value={moodScore} onChange={handleMoodChange} />
              </Card>
            </FadeIn>

            <FadeIn>
              <Card className="mt-4 shadow-toss-card">
                <CardTitle>2) 오늘 체크리스트</CardTitle>
                <CardDescription>
                  짧고 가볍게. &quot;완벽&quot;이 아니라 &quot;완료&quot;가 목표예요.
                </CardDescription>

                <StaggerList stagger={0.06} className="mt-4 grid gap-2">
                  {checklistItems.map((item) => (
                    <StaggerItem key={item.key}>
                      <ChecklistItem
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
                            : item.key === "mood" || item.key === "daily_video"
                              ? () => {
                                  if (item.key === "daily_video") {
                                    toast.show(
                                      "영상을 시청하면 자동으로 체크돼요",
                                      "success",
                                    );
                                  }
                                }
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
                    </StaggerItem>
                  ))}
                </StaggerList>

                <div className="mt-4 flex gap-2 flex-wrap">
                  <a
                    href="/progress"
                    className="border border-gs-blue/35 bg-gs-blue-light text-gs-blue rounded-xl px-3 py-2 text-[13px] font-[950] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-gs-card"
                  >
                    → 나의성장방에서 보기
                  </a>
                </div>
              </Card>
            </FadeIn>

            <FadeIn>
              <Card className="mt-4 scroll-mt-28 shadow-toss-card" id="gratitudeCard">
                <CardTitle>감사일기</CardTitle>
                <CardDescription>
                  오늘의 감사 한 줄. 저장하면 성장방에 날짜별로 쌓입니다.
                </CardDescription>

                {savedGratitude && (
                  <div
                    data-testid="saved-gratitude"
                    className="mt-4 p-3 rounded-[12px] bg-gs-surface-muted border border-gs-line-soft text-[13px] text-gs-text-soft opacity-70 whitespace-pre-line"
                  >
                    <div className="text-[11px] font-bold text-gs-muted mb-1">
                      ✓ 오늘 저장됨
                    </div>
                    {savedGratitude}
                  </div>
                )}

                <textarea
                  ref={gratitudeRef}
                  value={gratitudeText}
                  onChange={(e) => setGratitudeText(e.target.value)}
                  placeholder={
                    savedGratitude
                      ? "추가로 더 적어볼까요?"
                      : "예) 오늘은 내가 포기하지 않은 게 고맙다.\n예) 따뜻한 말 한마디가 고마웠다."
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
                      setSavedGratitude(trimmed);
                      setGratitudeText("");
                      toast.show("감사일기가 저장되었습니다", "success");
                    }}
                    className="border border-gs-blue/35 bg-gs-blue-light text-gs-blue rounded-xl px-3 py-2 text-[13px] font-[950] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-gs-card"
                  >
                    감사일기 저장
                  </button>
                </div>
              </Card>
            </FadeIn>
          </div>

          <FadeIn>
            <RoutineSidebar
              moodScore={moodScore}
              completionRate={completionRate}
              streak={initial.streak}
              totalDays={initial.totalDays}
              hint="혼합형은 '하나만 선택'이 승리예요. 오늘은 1개만 해도 OK."
            />
          </FadeIn>
        </div>
      </main>
    </PageFade>
  );
}
