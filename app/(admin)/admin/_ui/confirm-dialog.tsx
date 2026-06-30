"use client";

import { useState } from "react";
import { Modal } from "./modal";
import { Button } from "@/components/ui/button";
import { Input } from "./field";

/**
 * 확인 다이얼로그. tone="danger"면 위험 스타일.
 * confirmKeyword를 주면 그 단어를 타이핑해야 확인 버튼 활성화(되돌릴 수 없는 작업).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  tone = "default",
  confirmKeyword,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  confirmKeyword?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setTyped("");
    }
  };

  const keywordOk = !confirmKeyword || typed.trim() === confirmKeyword;

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={busy || !keywordOk}
          >
            {busy ? "처리 중…" : confirmLabel}
          </Button>
        </>
      }
    >
      {description ? (
        <div className="text-sm text-gs-text-strong leading-relaxed">
          {description}
        </div>
      ) : null}
      {confirmKeyword ? (
        <div className="mt-3">
          <p className="text-xs text-gs-muted mb-1.5">
            확인을 위해 <b className="text-gs-danger">{confirmKeyword}</b> 를 입력하세요.
          </p>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmKeyword}
            autoFocus
          />
        </div>
      ) : null}
    </Modal>
  );
}
