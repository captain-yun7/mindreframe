"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastVariant = "default" | "error" | "success";
type Toast = { id: number; message: string; variant: ToastVariant };

const ToastContext = createContext<{
  show: (message: string, variant?: ToastVariant) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, variant: ToastVariant = "default") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-gs-dropdown text-sm font-medium max-w-[380px] animate-[slide-in_0.2s_ease-out] ${
              t.variant === "error"
                ? "bg-gs-danger-bg text-gs-danger border border-gs-danger-border"
                : t.variant === "success"
                  ? "bg-gs-success-bg text-gs-success border border-gs-success-border"
                  : "bg-white text-gs-text-strong border border-gs-line-soft"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
