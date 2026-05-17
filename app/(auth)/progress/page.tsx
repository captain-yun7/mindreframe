import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { Card, CardTitle, CardDescription } from "@/components/card";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { AnalysisCardList, type AnalysisItem } from "./analysis-card-list";
import { parseExerciseNote } from "@/lib/exercise-payload";
import { EmotionChart } from "./emotion-chart";

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
  }[];
  recentMeditations: {
    id: string;
    track_title: string;
    duration: number | null;
    completed_at: string;
  }[];
  emotionPoints: { score: number; recorded_at: string }[];
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
    emotionPoints: stats.emotionPoints.map((p) => ({
      date: p.recorded_at,
      score: p.score,
    })),
  };
}

export default async function ProgressPage() {
  const stats = await loadStats();

  const kpis = [
    { label: "총 훈련일수", value: `${stats?.totalDays ?? 0}일` },
    { label: "연속 스트릭", value: `${stats?.streak ?? 0}일` },
    { label: "분석 횟수", value: `${stats?.analysesCount ?? 0}회` },
    { label: "대안사고", value: `${stats?.alternativesCount ?? 0}개` },
  ];

  // 자동 배지 판정 (임시 — 추후 user_badges 테이블 정식 운영)
  const earnedSet = new Set<string>();
  // 첫 시작: 분석 1회 또는 어떤 활동이라도 1건 (가입 후 첫 인터랙션)
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

  return (
    <PageLayout>
      <PageTitle>나의성장방</PageTitle>
      <PageLead>꾸준함이 만드는 변화를 확인해보세요.</PageLead>

      <div className="mt-6 grid grid-cols-4 gap-3 max-sm:grid-cols-2">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            data-testid={`kpi-${kpi.label}`}
            className="bg-white rounded-[14px] p-4 border border-gs-line-soft shadow-gs-card text-center"
          >
            <div className="text-xs text-gs-muted font-[750]">{kpi.label}</div>
            <div className="text-xl font-[950] mt-1">{kpi.value}</div>
          </div>
        ))}
      </div>

      <Card className="mt-4 scroll-mt-28" id="emotion-chart">
        <CardTitle>감정 변화 추이</CardTitle>
        <CardDescription>최근 14일간 오늘의 루틴에서 입력한 감정 점수.</CardDescription>
        <EmotionChart points={stats?.emotionPoints ?? []} />
      </Card>

      <Card className="mt-4">
        <CardTitle>획득 배지</CardTitle>
        <div className="mt-4 grid grid-cols-4 gap-3 max-sm:grid-cols-2">
          {fixedBadges.map((badge) => {
            const earned = earnedSet.has(badge.title);
            return (
              <div
                key={badge.title}
                className={`rounded-[14px] p-3 text-center border ${
                  earned
                    ? "bg-gradient-to-br from-[#fef9c3] to-gs-warning-bg border-gs-gold-border"
                    : "bg-gs-surface-muted border-gs-line-soft opacity-50"
                }`}
              >
                <div className="text-3xl">{badge.icon}</div>
                <div className="text-xs font-[950] mt-1">{badge.title}</div>
                <div className="text-[11px] text-gs-muted">{badge.desc}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>대안적 사고 카드</CardTitle>
        <CardDescription>가짜생각 분석기에서 찾은 대안적 사고들이 모입니다.</CardDescription>
        {stats && stats.recentAlternatives.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {stats.recentAlternatives.map((r) => (
              <li
                key={r.id}
                className="p-3 rounded-[12px] bg-gs-surface-muted border border-gs-line-soft text-[13px]"
              >
                {r.alternative_thought}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 text-center text-gs-muted text-[13px] py-8">
            아직 저장된 대안사고가 없습니다.
            <br />
            가짜생각 분석기를 사용해보세요.
          </div>
        )}
      </Card>

      {/* 가짜생각 분석기 — JSON 카드 + 클릭 시 대화 전체 모달 */}
      <Card className="mt-4">
        <CardTitle>가짜생각 분석 기록</CardTitle>
        <CardDescription>분석기와 나눈 대화에서 추출된 인지왜곡·자동사고·대안사고.</CardDescription>
        {stats && stats.recentAnalyses.length > 0 ? (
          <AnalysisCardList items={stats.recentAnalyses as AnalysisItem[]} />
        ) : (
          <div className="mt-4 text-center text-gs-muted text-[13px] py-6">
            분석기에서 대화 후 &ldquo;정리하고 저장&rdquo;을 누르면 여기에 모입니다.
          </div>
        )}
      </Card>

      {/* 생각쓰레기통 */}
      <Card className="mt-4">
        <CardTitle>생각쓰레기통 기록</CardTitle>
        <CardDescription>상황·생각·감정·신체반응·행동으로 분리된 기록.</CardDescription>
        {stats && stats.recentThoughts.length > 0 ? (
          <ul className="mt-4 space-y-2" data-testid="recent-thoughts">
            {stats.recentThoughts.map((t) => (
              <li
                key={t.id}
                className="p-3 rounded-[12px] bg-gs-surface-muted border border-gs-line-soft text-[13px]"
              >
                <div className="text-gs-muted text-[11px] mb-1">
                  {new Date(t.created_at).toLocaleString("ko-KR")}
                </div>
                <div className="font-bold">{t.situation}</div>
                {t.thought && <div className="text-gs-text-soft mt-0.5">생각 · {t.thought}</div>}
                {t.emotion && <div className="text-gs-text-soft">감정 · {t.emotion}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 text-center text-gs-muted text-[13px] py-6">
            생각쓰레기통에 기록을 남기면 여기에 모입니다.
          </div>
        )}
      </Card>

      {/* 감사일기 */}
      <Card className="mt-4">
        <CardTitle>감사일기</CardTitle>
        <CardDescription>오늘 감사했던 한 줄을 모았어요.</CardDescription>
        {stats && stats.recentGratitudes.length > 0 ? (
          <ul className="mt-4 space-y-2" data-testid="recent-gratitudes">
            {stats.recentGratitudes.map((g) => (
              <li
                key={g.id}
                className="p-3 rounded-[12px] bg-gs-surface-muted border border-gs-line-soft text-[13px]"
              >
                <div className="text-gs-muted text-[11px] mb-1">{g.recorded_at}</div>
                <div>{g.content}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 text-center text-gs-muted text-[13px] py-6">
            오늘의 루틴에서 감사일기를 저장하면 여기에 모입니다.
          </div>
        )}
      </Card>

      {/* 행동연습장 */}
      <Card className="mt-4">
        <CardTitle>행동연습장 기록</CardTitle>
        <CardDescription>계획 → 실행 → 회고 순서로 정리된 기록.</CardDescription>
        {stats && stats.recentExercises.length > 0 ? (
          <ul className="mt-4 space-y-2" data-testid="recent-exercises">
            {stats.recentExercises.map((e) => {
              const parsed = parseExerciseNote(e.note as string | null);
              const isStructured = "plan" in parsed;
              return (
                <li
                  key={e.id}
                  className="p-3 rounded-[12px] bg-gs-surface-muted border border-gs-line-soft text-[13px]"
                >
                  <div className="text-gs-muted text-[11px] mb-1">
                    {e.exercise_key === "courage" ? "용기있는 행동" : "불안노출"} ·{" "}
                    {new Date(e.completed_at).toLocaleString("ko-KR")}
                  </div>
                  <div className="font-bold">{e.exercise_title}</div>
                  {isStructured ? (
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
                        <div className="mt-1 text-gs-muted text-[12px]">
                          💭 {parsed.reflection}
                        </div>
                      )}
                    </div>
                  ) : (
                    "plain" in parsed &&
                    parsed.plain && (
                      <div className="text-gs-text-soft mt-0.5">{parsed.plain}</div>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 text-center text-gs-muted text-[13px] py-6">
            행동연습장에서 기록을 저장하면 여기에 모입니다.
          </div>
        )}
      </Card>

      {/* 명상 */}
      <Card className="mt-4">
        <CardTitle>명상 기록</CardTitle>
        <CardDescription>명상 트랙 재생 기록.</CardDescription>
        {stats && stats.recentMeditations.length > 0 ? (
          <ul className="mt-4 space-y-2" data-testid="recent-meditations">
            {stats.recentMeditations.map((m) => (
              <li
                key={m.id}
                className="p-3 rounded-[12px] bg-gs-surface-muted border border-gs-line-soft text-[13px] flex justify-between"
              >
                <div>
                  <div className="font-bold">{m.track_title}</div>
                  <div className="text-gs-muted text-[11px] mt-0.5">
                    {new Date(m.completed_at).toLocaleString("ko-KR")}
                  </div>
                </div>
                <div className="text-gs-muted text-xs self-center">
                  {Math.round((m.duration ?? 0) / 60)}분
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 text-center text-gs-muted text-[13px] py-6">
            명상 트랙을 재생/완료하면 여기에 모입니다.
          </div>
        )}
      </Card>
    </PageLayout>
  );
}
