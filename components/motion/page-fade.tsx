"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

/**
 * 페이지 진입 fade.
 *
 * layout이나 page 최상단을 감싸면 라우트 진입 시 자연스럽게 fade-in.
 * SSR-safe: 초기 opacity 0 → 1 (0.3s). flicker 최소화를 위해 짧게.
 */
export interface PageFadeProps extends Omit<HTMLMotionProps<"main">, "initial" | "animate" | "transition"> {
  duration?: number;
}

export function PageFade({ duration = 0.3, children, ...rest }: PageFadeProps) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, ease: "easeOut" }}
      {...rest}
    >
      {children}
    </motion.main>
  );
}
