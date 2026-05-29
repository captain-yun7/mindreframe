"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * J4 / F145 — 성장방 대안적 사고 카드 (포커·타로 톤 리뉴얼).
 *
 * 변경:
 *   - 날짜 표시 제거
 *   - 폰트 18~20px로 ↑
 *   - rounded-3xl + gs-gold border-2 + shadow-xl
 *   - 인지왜곡 prefix 없이 "합리적 사고"만 노출 (호출부에서 rational만 전달)
 */

interface Props {
  text: string;
}

export function AlternativeThoughtCard({ text }: Props) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text?.trim() ?? "";
  const isLong = trimmed.length > 110 || trimmed.includes("\n");

  return (
    <div className="p-5 rounded-3xl border-2 border-gs-gold bg-gradient-to-br from-gs-gold-50 to-[#fff5ec] shadow-xl transition-transform hover:-translate-y-0.5">
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
  );
}
