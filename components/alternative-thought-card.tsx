"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * K6·F207 — 성장방 대안적 사고 카드 (게임형 보상 톤).
 *
 * 행동연습장 4단계 보상 팝업(CelebrationModal) 톤을 차용.
 *  - 인지왜곡 1개당 카드 1장 분리 (호출부에서 pair 단위로 매핑)
 *  - 인지왜곡명·날짜 표시 제거 (rational text만 노출)
 *  - 트로피 헤더 + "획득!" 카피 + ✨/⭐ 장식
 *  - gold 그라데이션 + gold-border + shadow-toss-deep
 *
 * Props:
 *   text — 합리적 사고 본문 (인지왜곡 prefix 없이)
 *   index — 카드 순번 (1·2·3…) — 트로피 카운터에 사용
 */

interface Props {
  text: string;
  index?: number;
}

export function AlternativeThoughtCard({ text, index }: Props) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text?.trim() ?? "";
  const isLong = trimmed.length > 110 || trimmed.includes("\n");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border-2 border-gs-gold-border bg-gradient-to-br from-[#fff5ec] via-white to-[#fff5ec] shadow-toss-deep transition-transform hover:-translate-y-0.5"
    >
      {/* 장식 (CelebrationModal 동일 톤) */}
      <div className="pointer-events-none absolute -left-4 -top-4 text-3xl opacity-25 select-none">
        ✨
      </div>
      <div className="pointer-events-none absolute -right-4 -bottom-4 text-3xl opacity-25 select-none">
        ✨
      </div>
      <div className="pointer-events-none absolute right-3 top-3 text-xl opacity-25 select-none">
        ⭐
      </div>

      <div className="px-5 pt-4 pb-5">
        {/* 트로피 헤더 */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-gs-gold-border px-2.5 py-1 text-[11px] font-extrabold text-gs-navy">
            <span className="text-base leading-none">🏆</span>
            합리적 사고 {typeof index === "number" ? `#${index}` : ""} 획득!
          </div>
        </div>

        {/* 본문 */}
        {!isLong ? (
          <div className="text-[18px] md:text-[20px] font-bold text-gs-navy whitespace-pre-wrap leading-[1.55] tracking-[-0.01em]">
            {trimmed || "—"}
          </div>
        ) : (
          <>
            <AnimatePresence initial={false} mode="wait">
              {expanded ? (
                <motion.div
                  key="full"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="text-[18px] md:text-[20px] font-bold text-gs-navy whitespace-pre-wrap leading-[1.55] tracking-[-0.01em]">
                    {trimmed}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="clamped"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[18px] md:text-[20px] font-bold text-gs-navy leading-[1.55] tracking-[-0.01em] line-clamp-3"
                >
                  {trimmed}
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 text-[13px] font-extrabold text-gs-navy hover:underline"
            >
              {expanded ? "닫기" : "더보기"}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
