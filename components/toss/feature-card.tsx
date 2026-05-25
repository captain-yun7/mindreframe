"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * 토스 톤 피처 카드.
 *
 * - icon  : ReactNode (lucide 등). emoji와 양자택일
 * - emoji : string (대형 이모지, 토스 톤 친근체)
 * - title / description
 * - href  : 있으면 Link로 감싸고 hover lift
 *
 * shadow-toss-card / rounded-toss-card / hover:-translate-y-1
 */
export interface FeatureCardProps {
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  description: string;
  href?: string;
  className?: string;
}

const baseClass =
  "block bg-white rounded-toss-card p-6 md:p-8 shadow-toss-card " +
  "transition-all duration-300 will-change-transform";

const interactiveClass =
  "hover:shadow-toss-card-hover hover:-translate-y-1 cursor-pointer";

export function FeatureCard({
  icon,
  emoji,
  title,
  description,
  href,
  className,
}: FeatureCardProps) {
  const inner = (
    <>
      {(icon || emoji) && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gs-navy-50 text-2xl text-gs-navy-bright">
          {emoji ? <span aria-hidden>{emoji}</span> : icon}
        </div>
      )}
      <h3 className="text-xl md:text-2xl font-bold tracking-[-0.02em] text-gs-text-strong">
        {title}
      </h3>
      <p className="mt-3 text-base text-gs-muted-soft leading-relaxed">
        {description}
      </p>
    </>
  );

  if (href) {
    return (
      <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
        <Link href={href} className={cn(baseClass, interactiveClass, className)}>
          {inner}
        </Link>
      </motion.div>
    );
  }

  return <div className={cn(baseClass, className)}>{inner}</div>;
}
