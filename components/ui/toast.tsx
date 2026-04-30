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
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-[0_8px_24px_rgba(15,23,42,0.18)] text-sm font-medium max-w-[380px] animate-[slide-in_0.2s_ease-out] ${
              t.variant === "error"
                ? "bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca]"
                : t.variant === "success"
                  ? "bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]"
                  : "bg-white text-[#111827] border border-[#e5e7eb]"
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
