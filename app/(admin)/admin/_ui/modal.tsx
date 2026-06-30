"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * 어드민 모달. ESC + 오버레이 클릭으로 닫힘. 중앙 정렬.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gs-navy-900/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[18px] shadow-gs-card-hover w-full max-h-[90vh] flex flex-col overflow-hidden"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title ? (
          <div className="px-5 pt-5 pb-3 border-b border-gs-line-soft">
            <h2 className="m-0 text-[16px] font-[950] tracking-[-0.03em] text-gs-navy-900">
              {title}
            </h2>
          </div>
        ) : null}
        <div className={cn("px-5 py-4 overflow-y-auto", !title && "pt-5")}>
          {children}
        </div>
        {footer ? (
          <div className="px-5 py-3 border-t border-gs-line-soft flex justify-end gap-2 bg-gs-surface-muted/40">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
