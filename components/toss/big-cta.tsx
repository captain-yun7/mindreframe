"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * 토스 톤 큰 라운드 CTA.
 *
 * - variant="primary" : gs-navy-bright 솔리드 (기본 행동)
 * - variant="gold"    : gs-gold 솔리드 (랜딩 최종 CTA)
 * - variant="ghost"   : 다크 hero 위의 보조 CTA (white outline)
 *
 * - size="lg" : h-12 px-6 rounded-toss-button (페이지 내 CTA)
 * - size="xl" : h-14 px-8 rounded-2xl (랜딩 hero 핵심 CTA)
 *
 * Framer Motion `whileTap`으로 살짝 눌리는 피드백. `whileHover`로 미세 lift.
 */
type Variant = "primary" | "gold" | "ghost";
type Size = "lg" | "xl";

export interface BigCtaProps {
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-gs-navy-bright text-white shadow-toss-card hover:shadow-toss-card-hover",
  gold:
    "bg-gs-gold text-gs-navy shadow-toss-card hover:shadow-toss-card-hover",
  ghost:
    "bg-white/10 text-white border border-white/30 backdrop-blur-sm hover:bg-white/15",
};

const sizeClass: Record<Size, string> = {
  lg: "h-12 px-6 text-sm rounded-toss-button",
  xl: "h-14 px-8 text-base rounded-2xl",
};

const baseClass =
  "inline-flex items-center justify-center font-bold tracking-[-0.02em] " +
  "transition-all cursor-pointer select-none whitespace-nowrap " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40 focus-visible:ring-offset-2 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export function BigCTA({
  href,
  onClick,
  variant = "primary",
  size = "lg",
  fullWidth = false,
  className,
  children,
}: BigCtaProps) {
  const classes = cn(
    baseClass,
    variantClass[variant],
    sizeClass[size],
    fullWidth && "w-full",
    className,
  );

  if (href) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn("inline-block", fullWidth && "w-full")}
      >
        <Link href={href} className={classes}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={classes}
      type="button"
    >
      {children}
    </motion.button>
  );
}
