"use client";

import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BigCTA } from "@/components/toss/big-cta";

/**
 * H4·H5 — 행동연습장 4단계 완성 칭찬 모달.
 *
 * forceOpen 트리거형 (storageKey 불필요 — 매번 노출).
 * 자동 닫힘: autoCloseMs (default 6000ms, 0이면 비활성)
 * 큰 가운데 텍스트 + 부드러운 골드 글로우 + 별 장식
 */

export interface CelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
  autoCloseMs?: number;
}

export function CelebrationModal({
  open,
  onOpenChange,
  title,
  body,
  ctaLabel = "확인",
  ctaHref,
  onCta,
  autoCloseMs = 0,
}: CelebrationModalProps) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // 자동 닫힘
  useEffect(() => {
    if (!open || autoCloseMs <= 0) return;
    const t = window.setTimeout(close, autoCloseMs);
    return () => window.clearTimeout(t);
  }, [open, autoCloseMs, close]);

  // scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleCta = useCallback(() => {
    onCta?.();
    close();
  }, [onCta, close]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="닫기"
            className="absolute inset-0 bg-gs-navy/50 backdrop-blur-md"
            onClick={close}
          />

          <motion.div
            className="relative w-full max-w-[480px] rounded-3xl bg-gradient-to-br from-[#fff5ec] via-white to-[#fff5ec] border-2 border-gs-gold-border shadow-toss-deep overflow-hidden"
            initial={{ opacity: 0, y: 32, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* 별 장식 */}
            <div className="pointer-events-none absolute -left-6 -top-6 text-5xl opacity-30 select-none">
              ✨
            </div>
            <div className="pointer-events-none absolute -right-6 -bottom-6 text-5xl opacity-30 select-none">
              ✨
            </div>
            <div className="pointer-events-none absolute right-4 top-4 text-3xl opacity-30 select-none">
              ⭐
            </div>

            <div className="px-7 pt-12 pb-8 text-center">
              <motion.div
                className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-gs-navy leading-[1.2]"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {title}
              </motion.div>

              {body ? (
                <motion.p
                  className="mt-5 text-[14px] text-gs-muted-soft leading-relaxed whitespace-pre-line"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  {body}
                </motion.p>
              ) : null}

              <motion.div
                className="mt-8"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.35 }}
              >
                {ctaHref ? (
                  <BigCTA variant="gold" size="lg" href={ctaHref} fullWidth>
                    {ctaLabel}
                  </BigCTA>
                ) : (
                  <BigCTA variant="gold" size="lg" fullWidth onClick={handleCta}>
                    {ctaLabel}
                  </BigCTA>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
