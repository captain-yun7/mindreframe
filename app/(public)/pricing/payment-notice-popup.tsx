"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BigCTA } from "@/components/toss/big-cta";

/**
 * 결제(PG) 지연 안내 팝업 — 요금제 페이지 진입 시마다 노출.
 * GamePopup과 달리 localStorage 쿨다운 없음: 결제가 정상화될 때까지
 * 모든 방문자가 반드시 봐야 하는 안내라 매 진입마다 띄운다.
 * 결제 정상화 시 이 컴포넌트 렌더링을 제거하면 됨.
 */
export function PaymentNoticePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setOpen(true), 350);
    return () => window.clearTimeout(t);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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
          data-testid="payment-notice-popup"
        >
          <button
            type="button"
            aria-label="모달 닫기"
            className="absolute inset-0 bg-gs-navy/40 backdrop-blur-md"
            onClick={close}
          />

          <motion.div
            className="relative w-full max-w-[440px] rounded-3xl bg-white shadow-toss-deep overflow-hidden"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-6 pt-8 pb-6 md:px-8 md:pt-10 md:pb-7">
              <div className="text-center text-5xl mb-3" aria-hidden>
                📱
              </div>
              <h2 className="text-center text-2xl font-extrabold tracking-[-0.03em] text-gs-text-strong">
                결제 안내
              </h2>
              <div className="mt-4 text-[15px] text-gs-muted-soft leading-relaxed text-center">
                현재 결제가 원활하지 않습니다.
                <br />
                결제를 원하시는 분께서는 문자 주세요.
                <br />
                <span className="mt-2 inline-block text-lg font-extrabold text-gs-text-strong">
                  010-5941-1357
                </span>
              </div>

              <div className="mt-7 flex flex-col items-center gap-3">
                <BigCTA
                  variant="gold"
                  size="xl"
                  fullWidth
                  onClick={() => {
                    window.location.href = "sms:010-5941-1357";
                  }}
                >
                  문자 보내기
                </BigCTA>
                <button
                  type="button"
                  onClick={close}
                  className="text-[13px] font-medium text-gs-muted-soft hover:text-gs-text-strong transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
