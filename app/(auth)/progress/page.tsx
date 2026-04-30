import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { Card, CardTitle, CardDescription } from "@/components/card";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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

async function loadStats() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const [routineCount, analysesCount, alternativesCount, gratitudeCount, meditationCount, recentAlternatives] =
    await Promise.all([
      supabase.from("routine_checks").select("checked_at", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("chat_analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("chat_analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("alternative_thought", "is", null),
      supabase.from("gratitude_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("meditation_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("chat_analyses")
        .select("id, alternative_thought, created_at")
        .eq("user_id", user.id)
        .not("alternative_thought", "is", null)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  // 총 훈련일수: distinct checked_at
  const { data: distinctDates } = await supabase
    .from("routine_checks")
    .select("checked_at")
    .eq("user_id", user.id);
  const uniqueDays = new Set((distinctDates ?? []).map((r) => r.checked_at)).size;

  // 스트릭: 오늘부터 거꾸로 연속된 날 수
  const dateSet = new Set((distinctDates ?? []).map((r) => r.checked_at));
  let streak = 0;
  const cursor = new Date();
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalDays: uniqueDays,
    streak,
    analysesCount: analysesCount.count ?? 0,
    alternativesCount: alternativesCount.count ?? 0,
    gratitudeCount: gratitudeCount.count ?? 0,
    meditationCount: meditationCount.count ?? 0,
    recentAlternatives: recentAlternatives.data ?? [],
    routineCount: routineCount.count ?? 0,
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
  if ((stats?.analysesCount ?? 0) >= 1) earnedSet.add("첫 시작");
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

      <Card className="mt-4">
        <CardTitle>감정 변화 추이</CardTitle>
        <CardDescription>루틴에서 입력한 감정 점수의 변화를 확인해보세요.</CardDescription>
        <div className="mt-4 h-[200px] bg-gs-surface-muted rounded-[14px] flex items-center justify-center text-gs-muted text-[13px]">
          데이터가 쌓이면 감정 변화 그래프가 표시됩니다.
        </div>
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
    </PageLayout>
  );
}
