import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 토스 톤 풀와이드 섹션 wrapper.
 *
 * - tone="light"   : 흰 배경 (기본)
 * - tone="navy-50" : 옅은 푸른 배경 (gs-navy-50, 섹션 구분)
 * - tone="dark"    : gs-navy 다크 배경 + 흰 텍스트
 *
 * compact=true 시 패딩 축소 (모달 안 섹션·작은 컴포넌트용).
 *
 * 내부는 max-w-[1200px] mx-auto px-4 — 토스 톤의 풍부한 좌우 여백.
 */
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  tone?: "light" | "navy-50" | "dark";
  compact?: boolean;
  innerClassName?: string;
  children: React.ReactNode;
}

const toneClass: Record<NonNullable<SectionProps["tone"]>, string> = {
  light: "bg-white text-gs-text-strong",
  "navy-50": "bg-gs-navy-50 text-gs-text-strong",
  dark: "bg-gs-navy text-white",
};

export function Section({
  tone = "light",
  compact = false,
  className,
  innerClassName,
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      className={cn(
        toneClass[tone],
        compact ? "py-12 md:py-16" : "py-20 md:py-24",
        className,
      )}
      {...rest}
    >
      <div className={cn("mx-auto w-full max-w-[1200px] px-4 md:px-6", innerClassName)}>
        {children}
      </div>
    </section>
  );
}
