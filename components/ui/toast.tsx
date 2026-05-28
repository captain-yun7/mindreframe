"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastVariant = "default" | "error" | "success";
type Toast = { id: number; message: string; variant: ToastVariant };

const ToastContext = createContext<{
  show: (message: string, variant?: ToastVariant) => void;
} | null>(null);

// F139: success 토스트 자동 닫힘 시간 (센터 game 톤)
const SUCCESS_AUTO_CLOSE_MS = 2500;
// default·error 토스트 자동 닫힘 시간 (우상단)
const DEFAULT_AUTO_CLOSE_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, variant: ToastVariant = "default") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    const autoCloseMs =
      variant === "success" ? SUCCESS_AUTO_CLOSE_MS : DEFAULT_AUTO_CLOSE_MS;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, autoCloseMs);
  }, []);

  // 분기 — success 만 센터 game 톤, default/error 는 우상단 유지
  const cornerToasts = toasts.filter((t) => t.variant !== "success");
  const centerToasts = toasts.filter((t) => t.variant === "success");

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* 우상단 토스트 (default·error) */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {cornerToasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-gs-dropdown text-sm font-medium max-w-[380px] animate-[slide-in_0.2s_ease-out] ${
              t.variant === "error"
                ? "bg-gs-danger-bg text-gs-danger border border-gs-danger-border"
                : "bg-white text-gs-text-strong border border-gs-line-soft"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
      {/* F139: 센터 game 톤 success 모달 (gs-navy 배경 + gs-gold 강조 / 2.5초 자동 닫힘) */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none px-4">
        {centerToasts.map((t) => (
          <CenterSuccessCard key={t.id} message={t.message} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function CenterSuccessCard({ message }: { message: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // 마운트 직후 fade-in
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`pointer-events-none transition-all duration-300 ${
        visible ? "scale-100 opacity-100" : "scale-90 opacity-0"
      }`}
    >
      <div className="rounded-3xl border-2 border-gs-gold-border bg-gs-navy text-white shadow-toss-deep px-8 py-7 max-w-[360px] text-center">
        <p className="text-2xl mb-2" aria-hidden>
          ✨
        </p>
        <p className="text-xl font-extrabold tracking-[-0.03em] leading-[1.4] text-white">
          <span className="text-gs-gold">{message}</span>
        </p>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
