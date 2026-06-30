import { cn } from "@/lib/utils";
import type { BadgeTone } from "./lib/labels";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "bg-gs-surface-muted text-gs-muted border-gs-line-soft",
  primary: "bg-gs-blue-soft text-gs-blue-soft-fg border-gs-blue/20",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-gs-danger-bg text-gs-danger border-gs-danger-border",
};

/**
 * 상태/플랜 칩. 직접 tone+label 지정하거나, labels.ts의 map을 거쳐 사용.
 */
export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold tracking-[-0.02em] whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** map(상태키 → {label,tone})으로 배지 렌더. 알 수 없는 키는 원문 + neutral. */
export function MappedBadge({
  value,
  map,
  className,
}: {
  value: string | null | undefined;
  map: Record<string, { label: string; tone: BadgeTone }>;
  className?: string;
}) {
  if (!value) return <span className="text-gs-muted">-</span>;
  const entry = map[value] ?? { label: value, tone: "neutral" as BadgeTone };
  return (
    <StatusBadge tone={entry.tone} className={className}>
      {entry.label}
    </StatusBadge>
  );
}
