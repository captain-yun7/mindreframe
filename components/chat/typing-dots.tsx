/**
 * J5 / F154 — typing indicator dots.
 * chat-container의 inline 컴포넌트에서 분리. 코치 채팅에서도 재사용.
 */

interface Props {
  /** dots만 표시할 때 (label 없을 때) */
  bare?: boolean;
  label?: string;
  className?: string;
}

export function TypingDots({ bare, label, className }: Props) {
  if (bare) {
    return (
      <span
        className={`inline-flex gap-1 items-center h-[1.2em] ${className ?? ""}`}
        aria-label="입력 중"
        role="status"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-gs-muted-soft/70 animate-bounce [animation-delay:-0.32s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gs-muted-soft/70 animate-bounce [animation-delay:-0.16s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gs-muted-soft/70 animate-bounce" />
      </span>
    );
  }
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-[14px] bg-white border border-gs-line-soft ${className ?? ""}`}
      aria-label="입력 중"
      role="status"
    >
      {label && <span className="text-xs text-gs-muted-soft">{label}</span>}
      <span className="inline-flex gap-1 items-center h-[1.2em]">
        <span className="w-1.5 h-1.5 rounded-full bg-gs-muted-soft/70 animate-bounce [animation-delay:-0.32s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gs-muted-soft/70 animate-bounce [animation-delay:-0.16s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gs-muted-soft/70 animate-bounce" />
      </span>
    </div>
  );
}
