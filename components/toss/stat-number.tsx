import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 토스 톤 큰 숫자 통계.
 *
 * - value : 표시 값 (string | number). 단위 포함 가능 ("1,250+", "98%")
 * - label : 하단 설명
 * - accent : "navy" | "gold"
 */
export interface StatNumberProps {
  value: React.ReactNode;
  label: string;
  accent?: "navy" | "gold";
  className?: string;
}

const accentClass: Record<NonNullable<StatNumberProps["accent"]>, string> = {
  navy: "text-gs-navy-bright",
  gold: "text-gs-gold-700",
};

export function StatNumber({
  value,
  label,
  accent = "navy",
  className,
}: StatNumberProps) {
  return (
    <div className={cn("text-center", className)}>
      <div
        className={cn(
          "text-5xl md:text-6xl font-extrabold tracking-[-0.04em]",
          accentClass[accent],
        )}
      >
        {value}
      </div>
      <div className="mt-3 text-sm md:text-base font-medium text-gs-muted-soft">
        {label}
      </div>
    </div>
  );
}
