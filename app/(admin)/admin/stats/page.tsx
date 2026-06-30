import { PageHeader } from "../_ui/page-header";
import { Card, CardTitle } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";

export default async function AdminStatsPage() {
  const { supabase } = await requireAdmin();

  // 일별 가입자 추이 (최근 14일)
  const since = new Date(Date.now() - 13 * 86_400_000).toISOString().slice(0, 10);
  const [signupRes, analysesRes, distortionsRes, plansRes] = await Promise.all([
    supabase
      .from("users")
      .select("created_at")
      .gte("created_at", `${since}T00:00:00+09:00`),
    supabase
      .from("chat_analyses")
      .select("created_at, distortion_types")
      .gte("created_at", `${since}T00:00:00+09:00`),
    supabase.from("chat_analyses").select("distortion_types"),
    supabase.from("users").select("plan"),
  ]);

  // 일별 카운트 집계
  const dayMap = (rows: { created_at: string }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const d = new Date(new Date(r.created_at).getTime() + 9 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    return m;
  };
  const signups = dayMap(signupRes.data ?? []);
  const analyses = dayMap(analysesRes.data ?? []);

  const dates: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.now() - (13 - i) * 86_400_000 + 9 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    dates.push(d);
  }

  // 인지왜곡 빈도
  const distMap = new Map<string, number>();
  for (const a of distortionsRes.data ?? []) {
    for (const d of (a.distortion_types as string[]) ?? []) {
      distMap.set(d, (distMap.get(d) ?? 0) + 1);
    }
  }
  const distortionsRanked = Array.from(distMap.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  // 플랜 분포
  const planMap = new Map<string, number>();
  for (const u of plansRes.data ?? []) {
    const p = (u.plan as string) ?? "free";
    planMap.set(p, (planMap.get(p) ?? 0) + 1);
  }
  const plans = ["free", "light", "pro", "premium"].map((p) => ({
    name: p,
    count: planMap.get(p) ?? 0,
  }));
  const totalUsers = plans.reduce((s, p) => s + p.count, 0);

  const maxDaily = Math.max(
    ...dates.map((d) => Math.max(signups.get(d) ?? 0, analyses.get(d) ?? 0)),
    1,
  );

  return (
    <>
      <PageHeader title="통계" />

      <Card className="mt-4">
        <CardTitle>최근 14일 가입·분석</CardTitle>
        <div className="mt-4 space-y-2">
          {dates.map((d) => (
            <div key={d} className="flex items-center gap-2 text-xs">
              <span className="w-20 text-gs-muted">{d.slice(5)}</span>
              <div className="flex-1 flex gap-1">
                <div className="flex-1">
                  <div
                    className="h-4 bg-gs-blue rounded"
                    style={{ width: `${((signups.get(d) ?? 0) / maxDaily) * 100}%` }}
                  />
                </div>
                <div className="w-10 text-right font-bold">{signups.get(d) ?? 0}</div>
              </div>
              <div className="flex-1 flex gap-1">
                <div className="flex-1">
                  <div
                    className="h-4 bg-gs-gold rounded"
                    style={{ width: `${((analyses.get(d) ?? 0) / maxDaily) * 100}%` }}
                  />
                </div>
                <div className="w-10 text-right font-bold">{analyses.get(d) ?? 0}</div>
              </div>
            </div>
          ))}
          <div className="flex gap-4 text-[11px] text-gs-muted mt-2 ml-20">
            <span>🟦 가입</span>
            <span>🟨 분석</span>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>플랜 분포</CardTitle>
        <div className="mt-3 space-y-2">
          {plans.map((p) => {
            const pct = totalUsers ? Math.round((p.count / totalUsers) * 100) : 0;
            return (
              <div key={p.name} className="flex items-center gap-2 text-sm">
                <span className="w-20 uppercase font-bold">{p.name}</span>
                <div className="flex-1 bg-gs-surface-muted rounded h-5 overflow-hidden">
                  <div
                    className="h-full bg-gs-blue"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-20 text-right text-xs">
                  {p.count}명 ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>인지왜곡 분포 (분석기 기록 기준)</CardTitle>
        {distortionsRanked.length === 0 ? (
          <p className="mt-3 text-sm text-gs-muted">분석 기록 없음</p>
        ) : (
          <div className="mt-3 space-y-1">
            {distortionsRanked.map(([name, count]) => (
              <div key={name} className="flex items-center gap-2 text-sm">
                <span className="w-28">{name}</span>
                <div className="flex-1 bg-gs-surface-muted rounded h-4 overflow-hidden">
                  <div
                    className="h-full bg-gs-gold"
                    style={{
                      width: `${(count / distortionsRanked[0][1]) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-12 text-right text-xs">{count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
