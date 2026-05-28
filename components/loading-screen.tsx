"use client";

import { motion } from "framer-motion";

/**
 * 토스 톤 Loading 컴포넌트.
 *
 * - 부드러운 페이드 진입 + 미니멀 spinner (gs-gold 톤 원형)
 * - 카피: 기본 "잠시만요" + 선택 hint
 * - 중앙 정렬, py-20 padding
 */

export function LoadingScreen({
  message = "잠시만요",
  hint,
}: {
  message?: string;
  hint?: string;
}) {
  return (
    <motion.div
      className="min-h-screen flex items-center justify-center px-4 py-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col items-center text-center max-w-[420px] w-full">
        <Spinner />
        <p className="mt-6 text-[15px] font-bold text-gs-text-strong tracking-[-0.02em]">
          {message}
        </p>
        {hint ? (
          <p className="mt-2 text-[13px] text-gs-muted-soft">{hint}</p>
        ) : null}
      </div>
    </motion.div>
  );
}

function Spinner() {
  return (
    <div className="relative h-12 w-12" aria-hidden>
      {/* 베이스 링 */}
      <span className="absolute inset-0 rounded-full border-[3px] border-gs-navy-100" />
      {/* 회전 호 */}
      <motion.span
        className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-gs-gold border-r-gs-gold"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
      />
    </div>
  );
}
