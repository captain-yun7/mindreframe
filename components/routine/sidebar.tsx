import Link from "next/link";

interface SidebarProps {
  moodScore: number | null;
  completionRate: string;
  streak: number;
  totalDays: number;
  hint: string;
}

export function RoutineSidebar({
  moodScore,
  completionRate,
  streak,
  totalDays,
  hint,
}: SidebarProps) {
  return (
    <aside
      className="rounded-toss-card p-5 bg-white shadow-toss-card border border-gs-line-soft"
      aria-label="오른쪽 요약"
    >
      <h3 className="m-0 text-sm font-bold tracking-[-0.02em] text-gs-text-strong">
        오늘 요약
      </h3>

      <SidebarBox label="오늘 감정 점수" value={moodScore !== null ? String(moodScore) : "-"} />
      <SidebarBox label="오늘 완료율" value={completionRate} />

      <h3 className="mt-5 m-0 text-sm font-bold tracking-[-0.02em] text-gs-text-strong">
        나의 흐름
      </h3>

      {/* 스트릭 pill — gs-gold 토스 톤 */}
      <div className="mt-3 flex items-center justify-between gap-2 px-4 py-3 rounded-full bg-gs-gold-50 border border-gs-gold/40">
        <span className="text-xs font-bold text-gs-gold-700">🔥 연속 스트릭</span>
        <span className="text-base font-extrabold text-gs-gold-700">{streak}일</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 px-4 py-3 rounded-full bg-gs-navy-50 border border-gs-navy-bright/15">
        <span className="text-xs font-bold text-gs-navy-bright">📅 누적 기록</span>
        <span className="text-base font-extrabold text-gs-navy-bright">{totalDays}일</span>
      </div>

      <p className="mt-4 text-gs-muted-soft text-xs font-medium leading-relaxed">{hint}</p>

      <div className="mt-4">
        <Link
          href="/progress"
          className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-toss-button bg-gs-navy-bright text-white text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-toss-card-hover"
        >
          나의 성장방 보기 →
        </Link>
      </div>
    </aside>
  );
}

function SidebarBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 rounded-toss-button bg-gs-navy-50/70 py-2.5 px-3 flex items-center justify-between gap-2">
      <span className="text-gs-muted-soft text-xs font-medium">{label}</span>
      <span className="text-sm font-extrabold text-gs-text-strong">{value}</span>
    </div>
  );
}
