"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

/**
 * 스크롤 진입 fade-up 래퍼.
 *
 * - `<FadeIn>...</FadeIn>` 으로 감싸면 화면에 들어올 때 한 번 fade + slide-up.
 * - SSR-safe: motion.div는 클라이언트 진입 후 마운트되며 초기 상태는 opacity 0 → 1.
 *   first paint에 잠깐 빈 화면이 보일 수 있으므로 above-the-fold hero는 delay=0 권장.
 *
 * 토스 톤: y=24, duration=0.6, once=true, margin="-80px"
 */
export interface FadeInProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "whileInView" | "viewport" | "transition"> {
  delay?: number;
  duration?: number;
  y?: number;
  once?: boolean;
}

export function FadeIn({
  delay = 0,
  duration = 0.6,
  y = 24,
  once = true,
  children,
  ...rest
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
