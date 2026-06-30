"use client";

/**
 * 하단 고정 일괄작업 바. count>0일 때만 표시. 다크 배경(네이비).
 */
export function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  if (count <= 0) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-3 bg-gs-navy-900 text-white rounded-full pl-5 pr-3 py-2.5 shadow-gs-card-hover">
      <span className="text-sm font-bold tabular-nums">
        {count}개 선택됨
      </span>
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-white/60 hover:text-white underline underline-offset-2"
      >
        해제
      </button>
      <div className="w-px h-5 bg-white/20" />
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
