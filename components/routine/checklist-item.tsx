"use client";

import Link from "next/link";

interface ChecklistItemProps {
  itemKey: string;
  label: string;
  description: string;
  checked: boolean;
  onCheck: (key: string, checked: boolean) => void;
  actionLabel: string;
  actionHref?: string;
  actionOnClick?: () => void;
  ghost?: boolean;
}

export function ChecklistItem({
  itemKey,
  label,
  description,
  checked,
  onCheck,
  actionLabel,
  actionHref,
  actionOnClick,
  ghost,
}: ChecklistItemProps) {
  const btnClass = ghost
    ? "border border-gs-line-soft bg-white text-gs-muted"
    : "border border-gs-blue/25 bg-gs-blue-light text-gs-blue";

  const actionEl = actionHref ? (
    <Link
      href={actionHref}
      className={`${btnClass} rounded-xl px-3 py-2 text-xs font-[950] whitespace-nowrap cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-gs-card`}
    >
      {actionLabel}
    </Link>
  ) : (
    <button
      type="button"
      onClick={actionOnClick}
      className={`${btnClass} rounded-xl px-3 py-2 text-xs font-[950] whitespace-nowrap cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-gs-card`}
    >
      {actionLabel}
    </button>
  );

  return (
    <div className="border border-gs-line-soft rounded-[14px] p-3 grid grid-cols-[22px_minmax(0,1fr)_auto] gap-3 items-center bg-white">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheck(itemKey, e.target.checked)}
        className="w-[18px] h-[18px] m-0 cursor-pointer accent-gs-blue"
        aria-label={label}
      />
      <div>
        <div className="font-[950] tracking-[-0.02em]">{label}</div>
        <div className="mt-1 text-gs-muted text-xs font-[750]">
          {description}
        </div>
      </div>
      {actionEl}
    </div>
  );
}
