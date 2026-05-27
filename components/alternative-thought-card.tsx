"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * H6/F119 — 성장방 대안적 사고 카드.
 * 게임 카드 톤: 살색 배경 + 금색 보더 + 그림자.
 * 본문이 길면 2줄로 잘라 표시, "더보기"로 펼치고 "닫기"로 접는다.
 */

interface Props {
  text: string;
  createdAt: string;
}

export function AlternativeThoughtCard({ text, createdAt }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 90 || text.includes("\n");

  return (
    <div className="p-3.5 rounded-[14px] border-2 border-gs-gold-border bg-[#fff5ec] shadow-toss-card">
      <div className="text-[10.5px] text-gs-navy/70 font-bold mb-1.5">
        {new Date(createdAt).toLocaleDateString("ko-KR")}
      </div>
      {!isLong ? (
        <div className="text-[13px] text-gs-text-strong whitespace-pre-wrap leading-[1.55]">
          {text || "—"}
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
                <div className="text-[13px] text-gs-text-strong whitespace-pre-wrap leading-[1.55]">
                  {text}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="clamped"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[13px] text-gs-text-strong leading-[1.55] line-clamp-2"
              >
                {text}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-[11.5px] font-bold text-gs-navy hover:underline"
          >
            {expanded ? "닫기" : "더보기"}
          </button>
        </>
      )}
    </div>
  );
}
