import { cn } from "@/lib/utils";

/**
 * 빈 상태 / 완료 상태. 테이블 내부·카드 내부 공용.
 */
export function EmptyState({
  title,
  desc,
  icon,
  action,
  className,
}: {
  title: string;
  desc?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-4 py-14 gap-2",
        className,
      )}
    >
      {icon ? <div className="text-gs-muted-light opacity-60 mb-1">{icon}</div> : null}
      <div className="text-sm font-bold text-gs-text-strong">{title}</div>
      {desc ? <div className="text-xs text-gs-muted max-w-sm">{desc}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
