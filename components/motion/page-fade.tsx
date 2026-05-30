"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * 페이지 진입 fade.
 *
 * layout이나 page 최상단을 감싸면 라우트 진입 시 자연스럽게 fade-in.
 * SSR-safe: 초기 opacity 0 → 1 (0.3s). flicker 최소화를 위해 짧게.
 *
 * K4·F176 — 라우트 변경 시 항상 페이지 top으로 스크롤. 단 location.hash가 있으면
 * anchor 스크롤(F199·F204처럼 /progress#exercises-list) 우선이므로 건너뜀.
 */
export interface PageFadeProps extends Omit<HTMLMotionProps<"main">, "initial" | "animate" | "transition"> {
  duration?: number;
}

export function PageFade({ duration = 0.3, children, ...rest }: PageFadeProps) {
  const pathname = usePathname();

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // 해시가 있으면 anchor scroll에 양보
    if (window.location.hash) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

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
