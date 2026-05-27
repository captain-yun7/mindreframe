"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BigCTA } from "@/components/toss/big-cta";

/**
 * H4 — 공용 게임 톤 팝업.
 *
 * 명상 온보딩 모달 패턴을 일반화. 쓰레기통·분석기·행동연습장 단계별 안내에 재사용.
 *
 * 동작:
 *  - 마운트 시 localStorage[storageKey]이 비었거나 hideForDays(7) 경과면 자동 노출
 *  - ESC/backdrop → 일반 닫기 (다음 진입 시 다시 노출)
 *  - "1주간 안 보기" → localStorage에 Date.now() 저장
 *  - eligible=false면 노출 X (조건부 표시: 가입일 14일 이내 등)
 *
 * variant:
 *  - navy: 기본 (gs-navy + 부드러운 글로우)
 *  - gold-border: 살색 배경 + 금색 테두리 (F111 톤)
 */

export type GamePopupVariant = "navy" | "gold-border";

export interface GamePopupProps {
  storageKey: string;
  title: string;
  body: string | ReactNode;
  ctaLabel?: string;
  onCta?: () => void;
  eligible?: boolean;
  hideForDays?: number;
  hideLabel?: string;
  variant?: GamePopupVariant;
  emoji?: string;
}

export function GamePopup({
  storageKey,
  title,
  body,
  ctaLabel = "시작하기",
  onCta,
  eligible = true,
  hideForDays = 7,
  hideLabel = "1주간 안 보기",
  variant = "navy",
  emoji,
}: GamePopupProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const dismissedAt = Number(raw);
        const sinceMs = Date.now() - dismissedAt;
        const windowMs = hideForDays * 24 * 60 * 60 * 1000;
        if (Number.isFinite(dismissedAt) && sinceMs < windowMs) return;
      }
    } catch {
      // ignore
    }
    const t = window.setTimeout(() => setOpen(true), 350);
    return () => window.clearTimeout(t);
  }, [eligible, hideForDays, storageKey]);

  const close = useCallback(() => setOpen(false), []);

  const dismissWeek = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      // ignore
    }
    setOpen(false);
  }, [storageKey]);

  const handleCta = useCallback(() => {
    onCta?.();
    setOpen(false);
  }, [onCta]);

  // ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!eligible) return null;

  const panelClass =
    variant === "gold-border"
      ? "relative w-full max-w-[440px] rounded-3xl bg-[#fff5ec] border-2 border-gs-gold-border shadow-toss-deep overflow-hidden"
      : "relative w-full max-w-[440px] rounded-3xl bg-white shadow-toss-deep overflow-hidden";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          data-testid={`game-popup-${storageKey}`}
        >
          <button
            type="button"
            aria-label="모달 닫기"
            className="absolute inset-0 bg-gs-navy/40 backdrop-blur-md"
            onClick={close}
          />

          <motion.div
            className={panelClass}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-6 pt-8 pb-6 md:px-8 md:pt-10 md:pb-7">
              {emoji ? (
                <div className="text-center text-5xl mb-3" aria-hidden>
                  {emoji}
                </div>
              ) : null}
              <h2 className="text-center text-2xl font-extrabold tracking-[-0.03em] text-gs-text-strong">
                {title}
              </h2>
              <div className="mt-4 text-[14px] text-gs-muted-soft leading-relaxed whitespace-pre-line text-left">
                {body}
              </div>

              <div className="mt-7 flex flex-col items-center gap-3">
                <BigCTA variant="gold" size="xl" fullWidth onClick={handleCta}>
                  {ctaLabel}
                </BigCTA>
                <button
                  type="button"
                  onClick={dismissWeek}
                  className="text-[13px] font-medium text-gs-muted-soft hover:text-gs-text-strong transition-colors"
                >
                  {hideLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
