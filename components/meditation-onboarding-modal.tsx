"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { BigCTA } from "@/components/toss/big-cta";

/**
 * F76 — 명상 온보딩 모달.
 *
 * 노출 조건:
 * - 사용자 가입일 14일 이내 (daysSinceJoin <= 14)
 * - localStorage `meditation_modal_dismissed_at`가 비었거나 7일 경과
 *
 * "일주일 동안 안 보기" 클릭 시 `Date.now()`를 localStorage에 저장 → 7일간 미노출.
 * "오늘 시작하기" 클릭 시 모달만 닫고 페이지 그대로 (이미 /meditation 진입 가정).
 */

const STORAGE_KEY = "meditation_modal_dismissed_at";
const DISMISS_DAYS = 7;
const ELIGIBLE_DAYS = 14;
const TOTAL_DAYS = 14;

export interface MeditationOnboardingModalProps {
  daysSinceJoin: number | null;
  /** H3·H4: site_settings.popup_meditation_focus JSON 원본 — 본문 카피 교체 */
  popupJson?: string;
}

interface PopupContent {
  title: string;
  body: string;
  cta?: string;
}

function parsePopup(raw: string | undefined): PopupContent | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && typeof obj.title === "string") {
      return obj as PopupContent;
    }
  } catch {
    // ignore
  }
  return null;
}

export function MeditationOnboardingModal({
  daysSinceJoin,
  popupJson,
}: MeditationOnboardingModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (daysSinceJoin === null) return;
    if (daysSinceJoin > ELIGIBLE_DAYS) return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const dismissedAt = Number(raw);
        const sinceDismissMs = Date.now() - dismissedAt;
        const dismissWindowMs = DISMISS_DAYS * 24 * 60 * 60 * 1000;
        if (Number.isFinite(dismissedAt) && sinceDismissMs < dismissWindowMs) {
          return;
        }
      }
    } catch {
      // localStorage 접근 실패 시 그냥 보임
    }

    // 가벼운 진입 딜레이 — 페이지 진입 직후 폭격 방지
    const timer = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(timer);
  }, [daysSinceJoin]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleDismissWeek = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // localStorage 차단 환경 — 그냥 닫기만
    }
    setOpen(false);
  }, []);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  // body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (daysSinceJoin === null || daysSinceJoin > ELIGIBLE_DAYS) return null;

  const currentDay = Math.min(Math.max(daysSinceJoin, 1), TOTAL_DAYS);
  const progressPct = Math.round((currentDay / TOTAL_DAYS) * 100);

  // H4: site_settings에서 초점 이동 훈련 가이드 콘텐츠 (있으면 본문 교체)
  const popup = parsePopup(popupJson);

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
          aria-labelledby="meditation-modal-title"
        >
          {/* backdrop */}
          <button
            type="button"
            aria-label="모달 닫기"
            className="absolute inset-0 bg-gs-navy/40 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* panel */}
          <motion.div
            className="relative w-full max-w-[420px] rounded-3xl bg-white shadow-toss-deep overflow-hidden"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-6 pt-8 pb-6 md:px-8 md:pt-10 md:pb-7 text-center">
              <div className="mx-auto mb-5 flex h-32 w-32 items-center justify-center rounded-full bg-gs-navy-50">
                <Image
                  src="/illustrations/meditation-calm.svg"
                  alt=""
                  width={120}
                  height={120}
                  className="h-28 w-28"
                  aria-hidden
                />
              </div>

              <h2
                id="meditation-modal-title"
                className="text-2xl font-extrabold tracking-[-0.03em] text-gs-text-strong"
              >
                {popup?.title ?? "잠시 쉬어가요 🌙"}
              </h2>
              {popup?.body ? (
                <p className="mt-3 text-[13.5px] text-gs-muted-soft leading-relaxed whitespace-pre-line text-left">
                  {popup.body}
                </p>
              ) : (
                <p className="mt-2 text-sm text-gs-muted-soft leading-relaxed">
                  오늘은 {currentDay}일차예요. 5분만 함께해요
                </p>
              )}

              {/* 진행률 바 */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-[11px] font-bold text-gs-muted-soft">
                  <span>{currentDay}일차</span>
                  <span>{TOTAL_DAYS}일</span>
                </div>
                <div
                  className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gs-navy-100"
                  role="progressbar"
                  aria-valuenow={currentDay}
                  aria-valuemin={1}
                  aria-valuemax={TOTAL_DAYS}
                >
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-gs-gold to-gs-gold-700"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>

              <div className="mt-7 flex flex-col items-center gap-3">
                <BigCTA
                  variant="gold"
                  size="xl"
                  fullWidth
                  onClick={handleClose}
                >
                  {popup?.cta ?? "오늘 시작하기"}
                </BigCTA>
                <button
                  type="button"
                  onClick={handleDismissWeek}
                  className="text-[13px] font-medium text-gs-muted-soft hover:text-gs-text-strong transition-colors"
                >
                  일주일 동안 안 보기
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
