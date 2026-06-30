import { cn } from "@/lib/utils";

/**
 * KPI 카드 — 라벨 + 큰 숫자 + (옵션) 보조 텍스트.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "danger" | "success";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-[14px] p-4 border border-gs-line-soft shadow-gs-card",
        className,
      )}
    >
      <div className="text-xs text-gs-muted font-bold">{label}</div>
      <div
        className={cn(
          "text-2xl font-extrabold tracking-[-0.02em] mt-1 tabular-nums",
          tone === "danger" && "text-gs-danger",
          tone === "success" && "text-emerald-600",
          tone === "default" && "text-gs-navy-900",
        )}
      >
        {value}
      </div>
      {hint ? <div className="text-[11px] text-gs-muted mt-1">{hint}</div> : null}
    </div>
  );
}
