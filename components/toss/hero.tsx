"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BigCTA } from "./big-cta";

/**
 * 토스 톤 Hero.
 *
 * - tone="dark"    : gs-navy 그라데이션 + 흰 텍스트 (랜딩)
 * - tone="navy-50" : 옅은 푸른 배경 + 진한 텍스트 (서비스 페이지)
 * - tone="white"   : 흰 배경 + 진한 텍스트 (서브 페이지)
 *
 * - align="center" : 중앙 정렬 (텍스트만)
 * - align="split"  : 좌측 텍스트 + 우측 일러스트 (데스크탑), 모바일에서는 일러스트 아래로
 */
type Tone = "dark" | "navy-50" | "white";
type Align = "center" | "split";

export interface HeroProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  cta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  illustration?: React.ReactNode;
  tone?: Tone;
  align?: Align;
  className?: string;
}

const toneBg: Record<Tone, string> = {
  dark: "bg-gradient-to-br from-gs-navy via-gs-navy-mid to-gs-navy-bright text-white",
  "navy-50": "bg-gs-navy-50 text-gs-text-strong",
  white: "bg-white text-gs-text-strong",
};

const titleColor: Record<Tone, string> = {
  dark: "text-white",
  "navy-50": "text-gs-navy",
  white: "text-gs-navy",
};

const subtitleColor: Record<Tone, string> = {
  dark: "text-white/80",
  "navy-50": "text-gs-muted-soft",
  white: "text-gs-muted-soft",
};

const eyebrowColor: Record<Tone, string> = {
  dark: "text-gs-gold",
  "navy-50": "text-gs-navy-bright",
  white: "text-gs-navy-bright",
};

export function Hero({
  eyebrow,
  title,
  subtitle,
  cta,
  secondaryCta,
  illustration,
  tone = "navy-50",
  align = "center",
  className,
}: HeroProps) {
  const isSplit = align === "split" && illustration;

  return (
    <section className={cn(toneBg[tone], "py-16 md:py-24", className)}>
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
        <div
          className={cn(
            isSplit
              ? "grid items-center gap-10 md:gap-12 lg:grid-cols-2"
              : "mx-auto max-w-3xl text-center",
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={cn(isSplit ? "text-left" : "text-center")}
          >
            {eyebrow && (
              <div
                className={cn(
                  "mb-4 text-sm md:text-base font-bold tracking-[-0.01em]",
                  eyebrowColor[tone],
                )}
              >
                {eyebrow}
              </div>
            )}
            <h1
              className={cn(
                "text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] leading-[1.1]",
                titleColor[tone],
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className={cn(
                  "mt-5 md:mt-6 text-base md:text-lg leading-relaxed",
                  subtitleColor[tone],
                )}
              >
                {subtitle}
              </p>
            )}
            {(cta || secondaryCta) && (
              <div
                className={cn(
                  "mt-8 flex flex-wrap gap-3",
                  isSplit ? "justify-start" : "justify-center",
                )}
              >
                {cta && (
                  <BigCTA
                    href={cta.href}
                    variant={tone === "dark" ? "gold" : "primary"}
                    size="xl"
                  >
                    {cta.label}
                  </BigCTA>
                )}
                {secondaryCta && (
                  <BigCTA
                    href={secondaryCta.href}
                    variant={tone === "dark" ? "ghost" : "primary"}
                    size="xl"
                  >
                    {secondaryCta.label}
                  </BigCTA>
                )}
              </div>
            )}
          </motion.div>

          {isSplit && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center"
            >
              {illustration}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
