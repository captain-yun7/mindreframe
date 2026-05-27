import Image from "next/image";
import { Card, CardTitle, CardDescription } from "@/components/card";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { AnalysisCardList, type AnalysisItem } from "./analysis-card-list";
import { parseExerciseNote } from "@/lib/exercise-payload";
import { parseAlternativeThought } from "@/lib/cbt/analysis-format";
import { EmotionChart } from "./emotion-chart";
import { GratitudeList } from "./gratitude-list";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerList, StaggerItem } from "@/components/motion/stagger-list";
import { PageFade } from "@/components/motion/page-fade";
import { getSiteSettings } from "@/lib/site-settings";
import { AlternativeThoughtCard } from "@/components/alternative-thought-card";

export const dynamic = "force-dynamic";

const fixedBadges = [
  { icon: "🌱", title: "첫 시작", desc: "첫 가짜생각 분석 완료" },
  { icon: "🔥", title: "3일 연속", desc: "3일 연속 루틴 완료" },
  { icon: "⭐", title: "7일 연속", desc: "7일 연속 루틴 완료" },
  { icon: "🏆", title: "30일 돌파", desc: "30일 누적 기록" },
  { icon: "💡", title: "사고 전환", desc: "대안사고 10개 달성" },
  { icon: "🧘", title: "명상 마스터", desc: "명상 20회 달성" },
  { icon: "📝", title: "기록왕", desc: "감사일기 30개 달성" },
  { icon: "🎯", title: "100일 완주", desc: "100일 프로그램 완주" },
];

interface ProgressStats {
  totalDays: number;
  analysesCount: number;
  alternativesCount: number;
  gratitudeCount: number;
  meditationCount: number;
  distinctDates: string[];
  recentAlternatives: {
    id: string;
    alternative_thought: string;
    created_at: string;
  }[];
  recentAnalyses: AnalysisItem[];
  recentThoughts: {
    id: string;
    situation: string;
    thought: string | null;
    emotion: string | null;
    body_reaction: string | null;
    behavior: string | null;
    created_at: string;
  }[];
  recentGratitudes: {
    id: string;
    content: string;
    recorded_at: string;
    created_at: string;
  }[];
  recentExercises: {
    id: string;
    exercise_key: string;
    exercise_title: string;
    note: string | null;
    completed_at: string;
    courage_level?: number | null;
  }[];
  recentMeditations: {
    id: string;
    track_title: string;
    duration: number | null;
    completed_at: string;
  }[];
  emotionPoints: { score: number; recorded_at: string }[];
  courageLevel?: number | null;
  totalExercises?: number | null;
}

async function loadStats() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_progress_stats", {
    p_user_id: user.id,
  });
  if (error || !data) {
    return null;
  }
  const stats = data as ProgressStats;

  // streak: distinctDates로 오늘부터 거꾸로 연속된 날 수 (DB에서 계산하려면 윈도 함수 필요 — 단순 set 매칭이 충분)
  const dateSet = new Set(stats.distinctDates);
  let streak = 0;
  const cursor = new Date();
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalDays: stats.totalDays,
    streak,
    analysesCount: stats.analysesCount,
    alternativesCount: stats.alternativesCount,
    gratitudeCount: stats.gratitudeCount,
    meditationCount: stats.meditationCount,
    recentAlternatives: stats.recentAlternatives,
    recentThoughts: stats.recentThoughts,
    recentGratitudes: stats.recentGratitudes,
    recentExercises: stats.recentExercises,
    recentMeditations: stats.recentMeditations,
    recentAnalyses: stats.recentAnalyses,
    courageLevel: stats.courageLevel ?? 0,
    totalExercises: stats.totalExercises ?? 0,
    emotionPoints: stats.emotionPoints.map((p) => ({
      date: p.recorded_at,
      score: p.score,
    })),
  };
}

async function loadNickname(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", user.id)
      .single();
    return (data?.nickname as string | null) ?? null;
  } catch {
    return null;
  }
}

export default async function ProgressPage() {
  const [stats, nickname, settings] = await Promise.all([
    loadStats(),
    loadNickname(),
    getSiteSettings(),
  ]);
  const heroSubtitle =
    settings.progress_hero_subtitle ??
    "기록은 거짓말하지 않아요. 오늘까지 함께한 흔적을 확인해보세요.";

  const kpis = [
    { label: "총 훈련일수", value: stats?.totalDays ?? 0, suffix: "일", accent: "navy" as const },
    { label: "연속 스트릭", value: stats?.streak ?? 0, suffix: "일", accent: "gold" as const },
    { label: "분석 횟수", value: stats?.analysesCount ?? 0, suffix: "회", accent: "navy" as const },
    { label: "대안사고", value: stats?.alternativesCount ?? 0, suffix: "개", accent: "navy" as const },
  ];

  // 자동 배지 판정 (임시 — 추후 user_badges 테이블 정식 운영)
  const earnedSet = new Set<string>();
  if (
    (stats?.analysesCount ?? 0) >= 1 ||
    (stats?.totalDays ?? 0) >= 1 ||
    (stats?.gratitudeCount ?? 0) >= 1 ||
    (stats?.meditationCount ?? 0) >= 1
  ) {
    earnedSet.add("첫 시작");
  }
  if ((stats?.totalDays ?? 0) >= 3) earnedSet.add("3일 연속");
  if ((stats?.totalDays ?? 0) >= 7) earnedSet.add("7일 연속");
  if ((stats?.totalDays ?? 0) >= 30) earnedSet.add("30일 돌파");
  if ((stats?.alternativesCount ?? 0) >= 10) earnedSet.add("사고 전환");
  if ((stats?.meditationCount ?? 0) >= 20) earnedSet.add("명상 마스터");
  if ((stats?.gratitudeCount ?? 0) >= 30) earnedSet.add("기록왕");
  if ((stats?.totalDays ?? 0) >= 100) earnedSet.add("100일 완주");

  const totalDaysSafe = stats?.totalDays ?? 0;
  const dayLabel = totalDaysSafe > 0 ? `${Math.min(totalDaysSafe, 100)}일차` : "첫 날";
  const greetName = nickname ? `${nickname}님, ` : "";

  return (
    <PageFade>
      {/* ── HERO ── */}
      <section className="bg-gs-navy-50 py-12 md:py-16">
        <div className="mx-auto w-full max-w-[1120px] px-4">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <FadeIn delay={0} y={16}>
              <div className="text-sm font-bold tracking-[-0.01em] text-gs-navy-bright mb-3">
                나의 성장방
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-gs-navy leading-[1.15]">
                {greetName}성장하고 있어요 ✨
              </h1>
              <p className="mt-4 md:mt-5 text-base md:text-lg text-gs-muted-soft leading-relaxed whitespace-pre-line">
                {heroSubtitle}
                <span className="text-gs-navy-bright font-bold">
                  {" "}
                  ({dayLabel})
                </span>
              </p>
            </FadeIn>

            <FadeIn delay={0.1} y={16} className="hidden lg:flex items-center justify-center">
              <Image
                src="/illustrations/progress-growth.svg"
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
        {/* KPI 그리드 */}
        <StaggerList
          stagger={0.08}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
        >
          {kpis.map((kpi) => (
            <StaggerItem key={kpi.label}>
              <div
                data-testid={`kpi-${kpi.label}`}
                className="bg-white rounded-toss-card p-5 md:p-6 shadow-toss-card text-center transition-all hover:-translate-y-1 hover:shadow-toss-card-hover"
              >
                <div
                  className={`text-3xl md:text-4xl font-extrabold tracking-[-0.04em] ${
                    kpi.accent === "gold" ? "text-gs-gold-700" : "text-gs-navy-bright"
                  }`}
                >
                  {kpi.value}
                  <span className="text-xl md:text-2xl ml-0.5">{kpi.suffix}</span>
                </div>
                <div className="mt-2 text-xs md:text-sm font-medium text-gs-muted-soft">
                  {kpi.label}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>

        <FadeIn>
          <Card className="mt-6 scroll-mt-28 shadow-toss-card" id="emotion-chart">
            <CardTitle>감정 변화 추이</CardTitle>
            <CardDescription>최근 14일간 오늘의 루틴에서 입력한 감정 점수.</CardDescription>
            <EmotionChart points={stats?.emotionPoints ?? []} />
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="mt-4 shadow-toss-card">
            <CardTitle>획득 배지</CardTitle>
            <div className="mt-4 grid grid-cols-4 gap-3 max-sm:grid-cols-2">
              {fixedBadges.map((badge) => {
                const earned = earnedSet.has(badge.title);
                return (
                  <div
                    key={badge.title}
                    className={`rounded-toss-card p-3 text-center border transition-all ${
                      earned
                        ? "bg-gradient-to-br from-gs-gold-50 to-gs-gold-100 border-gs-gold/50 shadow-toss-card"
                        : "bg-gs-surface-muted border-gs-line-soft opacity-50"
                    }`}
                  >
                    <div className="text-3xl">{badge.icon}</div>
                    <div className="text-xs font-extrabold mt-1 text-gs-text-strong">
                      {badge.title}
                    </div>
                    <div className="text-[11px] text-gs-muted-soft">{badge.desc}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="mt-4 shadow-toss-card">
            <CardTitle>대안적 사고 카드</CardTitle>
            <CardDescription>가짜생각 분석기에서 찾은 대안적 사고들이 모입니다.</CardDescription>
            {stats && stats.recentAlternatives.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.recentAlternatives.map((r) => {
                  const parsed = parseAlternativeThought(r.alternative_thought);
                  return (
                    <AlternativeThoughtCard
                      key={r.id}
                      text={parsed.text || "—"}
                      createdAt={r.created_at}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 text-center text-gs-muted-soft text-[13px] py-8">
                아직 저장된 대안사고가 없어요.
                <br />
                가짜생각 분석기를 사용해보세요.
              </div>
            )}
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="mt-4 shadow-toss-card">
            <CardTitle>가짜생각 분석 기록</CardTitle>
            <CardDescription>분석기와 나눈 대화에서 추출된 인지왜곡·자동사고·대안사고.</CardDescription>
            {stats && stats.recentAnalyses.length > 0 ? (
              <AnalysisCardList items={stats.recentAnalyses as AnalysisItem[]} />
            ) : (
              <div className="mt-4 text-center text-gs-muted-soft text-[13px] py-6">
                분석기에서 대화 후 &ldquo;정리하고 저장&rdquo;을 누르면 여기에 모입니다.
              </div>
            )}
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="mt-4 shadow-toss-card">
            <CardTitle>생각쓰레기통 기록</CardTitle>
            <CardDescription>상황·생각·감정·신체반응·행동으로 분리된 기록.</CardDescription>
            {stats && stats.recentThoughts.length > 0 ? (
              <ul className="mt-4 space-y-2" data-testid="recent-thoughts">
                {stats.recentThoughts.map((t) => (
                  <li
                    key={t.id}
                    className="p-3 rounded-[12px] bg-gs-navy-50/60 border border-gs-line-soft text-[13px]"
                  >
                    <div className="text-gs-muted-soft text-[11px] mb-1">
                      {new Date(t.created_at).toLocaleString("ko-KR")}
                    </div>
                    <div className="font-bold">{t.situation}</div>
                    {t.thought && <div className="text-gs-text-soft mt-0.5">생각 · {t.thought}</div>}
                    {t.emotion && <div className="text-gs-text-soft">감정 · {t.emotion}</div>}
                    {t.body_reaction && (
                      <div className="text-gs-text-soft">신체반응 · {t.body_reaction}</div>
                    )}
                    {t.behavior && <div className="text-gs-text-soft">행동 · {t.behavior}</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 text-center text-gs-muted-soft text-[13px] py-6">
                생각쓰레기통에 기록을 남기면 여기에 모입니다.
              </div>
            )}
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="mt-4 shadow-toss-card">
            <CardTitle>감사일기</CardTitle>
            <CardDescription>오늘 감사했던 한 줄을 모았어요.</CardDescription>
            <GratitudeList initial={stats?.recentGratitudes ?? []} />
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="mt-4 shadow-toss-card">
            <CardTitle>행동연습장 기록</CardTitle>
            <CardDescription>계획 → 실행 → 회고 순서로 정리된 기록.</CardDescription>
            {stats && stats.recentExercises.length > 0 ? (
              <ul className="mt-4 space-y-2" data-testid="recent-exercises">
                {stats.recentExercises.map((e) => {
                  const parsed = parseExerciseNote(e.note as string | null);
                  const isNew =
                    "type" in parsed &&
                    (parsed.type === "anxiety_exposure" ||
                      parsed.type === "depress_activity");
                  const isLegacy = !isNew && "plan" in parsed;
                  const modeLabel =
                    isNew && parsed.type === "anxiety_exposure"
                      ? "불안 줄이기"
                      : isNew && parsed.type === "depress_activity"
                        ? "우울 벗어나기"
                        : e.exercise_key === "courage"
                          ? "용기있는 행동"
                          : "불안노출";
                  const courageLevel = e.courage_level ?? null;
                  return (
                    <li
                      key={e.id}
                      className="p-3 rounded-[12px] bg-gs-navy-50/60 border border-gs-line-soft text-[13px]"
                    >
                      <div className="text-gs-muted-soft text-[11px] mb-1 flex items-center justify-between flex-wrap gap-1">
                        <span>
                          {modeLabel} ·{" "}
                          {new Date(e.completed_at).toLocaleString("ko-KR")}
                        </span>
                        {courageLevel != null && courageLevel > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff5ec] border border-gs-gold-border px-2 py-0.5 text-[10.5px] font-extrabold text-gs-navy">
                            🏆 용기 레벨 {courageLevel}
                          </span>
                        ) : null}
                      </div>
                      <div className="font-bold">{e.exercise_title}</div>
                      {isNew && parsed.type === "anxiety_exposure" && (
                        <div className="mt-1 space-y-0.5 text-gs-text-soft">
                          <div>
                            {parsed.did === "did" ? "✓ 도전함" : "✕ 못 함"}
                            {parsed.actualBefore != null && parsed.actualAfter != null && (
                              <> {" · "}불안 {parsed.actualBefore} → {parsed.actualAfter}</>
                            )}
                          </div>
                          {parsed.learnedLine && (
                            <div className="text-gs-muted-soft text-[12px]">
                              💭 {parsed.learnedLine}
                            </div>
                          )}
                          {parsed.unexpectedThought && (
                            <div className="text-gs-muted-soft text-[12px] italic">
                              🤔 예상치 못한 생각 · {parsed.unexpectedThought}
                            </div>
                          )}
                        </div>
                      )}
                      {isNew && parsed.type === "depress_activity" && (
                        <div className="mt-1 space-y-0.5 text-gs-text-soft">
                          <div>
                            {parsed.did === "did" ? "✓ 실행함" : "✕ 못 함"}
                            {parsed.actualAfter != null && (
                              <> {" · "}활동 후 기분 {parsed.actualAfter}</>
                            )}
                          </div>
                          {parsed.learnedLine && (
                            <div className="text-gs-muted-soft text-[12px]">
                              💭 {parsed.learnedLine}
                            </div>
                          )}
                          {parsed.unexpectedThought && (
                            <div className="text-gs-muted-soft text-[12px] italic">
                              🤔 예상치 못한 생각 · {parsed.unexpectedThought}
                            </div>
                          )}
                        </div>
                      )}
                      {isLegacy && (
                        <div className="mt-1 space-y-0.5 text-gs-text-soft">
                          {parsed.plan.when && <div>📅 {parsed.plan.when}</div>}
                          {parsed.plan.whereWho && <div>📍 {parsed.plan.whereWho}</div>}
                          {parsed.execution && (
                            <div>
                              {parsed.execution.did ? "✓ 실행함" : "✕ 못 함"}
                              {parsed.execution.before != null &&
                                parsed.execution.after != null && (
                                  <>
                                    {" · "}
                                    {e.exercise_key === "courage" ? "기분" : "불안"}{" "}
                                    {parsed.execution.before} → {parsed.execution.after}
                                  </>
                                )}
                            </div>
                          )}
                          {parsed.reflection && (
                            <div className="mt-1 text-gs-muted-soft text-[12px]">
                              💭 {parsed.reflection}
                            </div>
                          )}
                        </div>
                      )}
                      {!isNew &&
                        !isLegacy &&
                        "plain" in parsed &&
                        parsed.plain && (
                          <div className="text-gs-text-soft mt-0.5">{parsed.plain}</div>
                        )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-4 text-center text-gs-muted-soft text-[13px] py-6">
                행동연습장에서 기록을 저장하면 여기에 모입니다.
              </div>
            )}
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="mt-4 shadow-toss-card">
            <CardTitle>명상 기록</CardTitle>
            <CardDescription>명상 트랙 재생 기록.</CardDescription>
            {stats && stats.recentMeditations.length > 0 ? (
              <ul className="mt-4 space-y-2" data-testid="recent-meditations">
                {stats.recentMeditations.map((m) => (
                  <li
                    key={m.id}
                    className="p-3 rounded-[12px] bg-gs-navy-50/60 border border-gs-line-soft text-[13px] flex justify-between"
                  >
                    <div>
                      <div className="font-bold">{m.track_title}</div>
                      <div className="text-gs-muted-soft text-[11px] mt-0.5">
                        {new Date(m.completed_at).toLocaleString("ko-KR")}
                      </div>
                    </div>
                    <div className="text-gs-muted-soft text-xs self-center">
                      {Math.round((m.duration ?? 0) / 60)}분
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 text-center text-gs-muted-soft text-[13px] py-6">
                명상 트랙을 재생/완료하면 여기에 모입니다.
              </div>
            )}
          </Card>
        </FadeIn>
      </main>
    </PageFade>
  );
}
