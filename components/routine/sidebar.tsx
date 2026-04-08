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
      className="border border-[rgba(226,232,240,0.8)] rounded-[18px] p-3.5 bg-[rgba(37,99,235,0.035)]"
      aria-label="오른쪽 요약"
    >
      <h3 className="m-0 text-sm font-[950] tracking-[-0.03em]">오늘 요약</h3>

      <SidebarBox label="오늘 감정 점수" value={moodScore !== null ? String(moodScore) : "-"} />
      <SidebarBox label="오늘 완료율" value={completionRate} />

      <h3 className="m-0 text-sm font-[950] tracking-[-0.03em] mt-3.5">
        나의 흐름
      </h3>

      <SidebarBox label="연속 스트릭" value={`${streak}일`} />
      <SidebarBox label="누적 기록 일수" value={`${totalDays}일`} />

      <p className="mt-2.5 text-gs-muted text-[12.2px] font-[750]">{hint}</p>

      <div className="mt-3 flex gap-2.5 flex-wrap">
        <Link
          href="/"
          className="border border-gs-line bg-white rounded-xl px-3 py-2.5 text-[13px] font-[950] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-gs-card"
        >
          홈으로
        </Link>
        <Link
          href="/progress"
          className="border-[rgba(37,99,235,0.35)] border bg-gs-blue-light rounded-xl px-3 py-2.5 text-[13px] font-[950] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-gs-card"
        >
          성장방
        </Link>
      </div>
    </aside>
  );
}

function SidebarBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2.5 border border-[rgba(226,232,240,0.85)] rounded-[14px] bg-white/60 py-2.5 px-3 flex items-center justify-between gap-2.5">
      <span className="text-gs-muted text-[12.2px] font-[850]">{label}</span>
      <span className="text-[13.5px] font-[950]">{value}</span>
    </div>
  );
}
