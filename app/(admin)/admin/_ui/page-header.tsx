import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 어드민 페이지 헤더 — breadcrumb(뒤로가기) + 제목 + 설명 + 우측 액션.
 */
export function PageHeader({
  title,
  desc,
  backHref,
  backLabel = "← 목록",
  actions,
  className,
}: {
  title: React.ReactNode;
  desc?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5", className)}>
      {backHref ? (
        <Link
          href={backHref}
          className="inline-block text-[13px] text-gs-blue font-bold mb-2 hover:underline"
        >
          {backLabel}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="m-0 text-[22px] font-[950] tracking-[-0.04em] text-gs-navy-900">
            {title}
          </h1>
          {desc ? (
            <p className="mt-1.5 text-sm text-gs-muted font-medium">{desc}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
