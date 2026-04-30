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
      className="border border-gs-line-soft rounded-[18px] p-4 bg-gs-blue-light"
      aria-label="오른쪽 요약"
    >
      <h3 className="m-0 text-sm font-[950] tracking-[-0.03em]">오늘 요약</h3>

      <SidebarBox label="오늘 감정 점수" value={moodScore !== null ? String(moodScore) : "-"} />
      <SidebarBox label="오늘 완료율" value={completionRate} />

      <h3 className="m-0 text-sm font-[950] tracking-[-0.03em] mt-4">
        나의 흐름
      </h3>

      <SidebarBox label="연속 스트릭" value={`${streak}일`} />
      <SidebarBox label="누적 기록 일수" value={`${totalDays}일`} />

      <p className="mt-3 text-gs-muted text-xs font-[750]">{hint}</p>

      <div className="mt-4 flex gap-2 flex-wrap">
        <Link
          href="/"
          className="border border-gs-line bg-white rounded-xl px-3 py-2 text-[13px] font-[950] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-gs-card"
        >
          홈으로
        </Link>
        <Link
          href="/progress"
          className="border border-gs-blue/35 bg-gs-blue-light rounded-xl px-3 py-2 text-[13px] font-[950] text-gs-blue cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-gs-card"
        >
          성장방
        </Link>
      </div>
    </aside>
  );
}

function SidebarBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 border border-gs-line-soft rounded-[14px] bg-white/60 py-2 px-3 flex items-center justify-between gap-2">
      <span className="text-gs-muted text-xs font-[850]">{label}</span>
      <span className="text-sm font-[950]">{value}</span>
    </div>
  );
}
