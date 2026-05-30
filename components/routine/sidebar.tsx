import Link from "next/link";

interface SidebarProps {
  moodScore: number | null;
  completionRate: string;
  streak: number;
  totalDays: number;
  /** K2·F170 — 안내 hint는 옵셔널 (미전달 시 비표시) */
  hint?: string;
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
      className="rounded-toss-card p-6 bg-white shadow-toss-card border border-gs-line-soft"
      aria-label="오른쪽 요약"
    >
      {/* 오늘 요약 — 토스 dashboard 톤 깔끔한 KPI 카드 */}
      <h3 className="m-0 text-[13px] font-bold tracking-[-0.02em] text-gs-muted uppercase">
        오늘 요약
      </h3>

      <div className="mt-3 flex flex-col gap-1.5">
        <SidebarBox label="감정 점수" value={moodScore !== null ? String(moodScore) : "-"} />
        <SidebarBox label="완료율" value={completionRate} />
      </div>

      <h3 className="mt-6 m-0 text-[13px] font-bold tracking-[-0.02em] text-gs-muted uppercase">
        나의 흐름
      </h3>

      {/* 스트릭/누적 — 큰 숫자 + 미니멀 pill */}
      <div className="mt-3 rounded-toss-button bg-gs-gold-50 border border-gs-gold/30 px-4 py-3.5 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-gs-gold-700 tracking-[-0.02em]">
          <span aria-hidden>🔥</span>
          연속 스트릭
        </span>
        <span className="text-xl font-extrabold text-gs-gold-700 tabular-nums">
          {streak}
          <span className="text-xs font-bold ml-0.5">일</span>
        </span>
      </div>
      <div className="mt-2 rounded-toss-button bg-gs-navy-50 border border-gs-navy-bright/15 px-4 py-3.5 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-gs-navy-bright tracking-[-0.02em]">
          <span aria-hidden>📅</span>
          누적 기록
        </span>
        <span className="text-xl font-extrabold text-gs-navy-bright tabular-nums">
          {totalDays}
          <span className="text-xs font-bold ml-0.5">일</span>
        </span>
      </div>

      {hint ? (
        <p className="mt-5 text-gs-muted-soft text-xs font-medium leading-relaxed tracking-[-0.01em]">
          {hint}
        </p>
      ) : null}

      {/* K4·F171 — 타 메뉴(QuickNav)와 톤 통일: white bg + border + hover translate */}
      <div className="mt-5">
        <Link
          href="/progress"
          className="group flex items-center justify-center gap-1.5 w-full px-4 py-3 rounded-toss-button border border-gs-line-soft bg-white text-sm font-bold text-gs-text-strong tracking-[-0.02em] transition-all hover:border-gs-navy-bright hover:-translate-y-0.5 hover:shadow-toss-card"
        >
          <span aria-hidden>🌱</span>
          <span>나의 성장방 보기</span>
          <span className="ml-1 transition-transform group-hover:translate-x-0.5" aria-hidden>
            →
          </span>
        </Link>
      </div>
    </aside>
  );
}

function SidebarBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-toss-button bg-gs-surface-muted border border-gs-line-soft py-3 px-4 flex items-center justify-between gap-2">
      <span className="text-gs-muted-soft text-xs font-medium tracking-[-0.01em]">{label}</span>
      <span className="text-base font-extrabold text-gs-text-strong tabular-nums tracking-[-0.02em]">
        {value}
      </span>
    </div>
  );
}
