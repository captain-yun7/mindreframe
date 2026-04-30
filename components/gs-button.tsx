import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 가짜생각 공용 버튼.
 * - 같은 의미는 같은 시각 언어로. 페이지마다 인라인 className로 변주하지 않는다.
 * - shadcn `Button`(components/ui/button.tsx)은 admin/시스템용으로 남겨두고,
 *   본 서비스 화면은 이 컴포넌트를 사용한다.
 *
 * variant
 * - primary  : 기본 행동. 네이비 솔리드. ex) "쏟아내기", "분석"
 * - secondary: 보조 행동. 흰 배경 + 회색 테두리. ex) "초기화", "취소"
 * - soft     : 강조 보조. 블루 라이트 배경. ex) "→ 성장방으로 이동"
 * - danger   : 파괴/세션 종료. ex) "로그아웃"
 * - ghost    : 헤더/네비 등. 배경 없음.
 * - gold     : 랜딩 CTA. 골드 보더 + 글로우.
 *
 * size
 * - sm : 인라인/카드 내부 액션 (px-3 py-2)
 * - md : 일반 (px-4 py-2.5)
 * - lg : 페이지 핵심 CTA (px-6 py-3.5, full)
 */
type Variant = "primary" | "secondary" | "soft" | "danger" | "ghost" | "gold";
type Size = "sm" | "md" | "lg";

const baseClass =
  "inline-flex items-center justify-center font-bold tracking-[-0.02em] " +
  "transition-all cursor-pointer select-none whitespace-nowrap " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-gs-navy-bright text-white border border-transparent hover:brightness-105",
  secondary:
    "bg-white text-gs-text-strong border border-gs-line-soft hover:bg-gs-surface-mid",
  soft:
    "bg-gs-blue-light text-gs-blue border border-gs-blue/25 hover:translate-y-[-1px] hover:shadow-gs-card",
  danger:
    "bg-gs-danger-bg text-gs-danger border border-gs-danger-border hover:bg-gs-danger-border",
  ghost:
    "bg-transparent text-gs-text-strong border border-transparent hover:bg-gs-surface-mid",
  gold:
    "bg-transparent text-gs-gold border border-gs-gold shadow-[0_0_16px_rgba(250,204,107,0.7)] hover:shadow-[0_0_22px_rgba(250,204,107,0.95)] hover:brightness-[1.07]",
};

const sizeClass: Record<Size, string> = {
  sm: "text-[13px] px-3 py-2 rounded-xl",
  md: "text-sm px-4 py-2.5 rounded-2xl",
  lg: "text-base px-6 py-3.5 rounded-full",
};

export interface GsButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export const GsButton = React.forwardRef<HTMLButtonElement, GsButtonProps>(
  function GsButton(
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          baseClass,
          variantClass[variant],
          sizeClass[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      />
    );
  },
);
