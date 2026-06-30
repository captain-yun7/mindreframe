import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 서버 렌더 페이지네이션 — 현재 searchParams를 보존하며 page만 교체한 Link 생성.
 * "1–50 / 총 N건" 요약 + 처음/이전/페이지/다음/끝.
 */
export function Pagination({
  basePath,
  searchParams,
  page,
  pageSize,
  totalCount,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  totalCount: number;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  const hrefFor = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== "" && k !== "page") sp.set(k, v);
    }
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };

  const linkCls =
    "px-2.5 py-1.5 rounded-[8px] border border-gs-line-soft text-[13px] font-bold hover:bg-gs-surface-muted transition-colors";
  const disabledCls =
    "px-2.5 py-1.5 rounded-[8px] border border-gs-line-soft/50 text-[13px] font-bold text-gs-muted-light pointer-events-none opacity-50";

  // 페이지 윈도우 (현재 기준 ±2)
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="text-xs text-gs-muted font-medium">
        {from}–{to} / 총 {totalCount.toLocaleString("ko-KR")}건
      </div>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <>
            <Link href={hrefFor(1)} className={linkCls} aria-label="처음">
              «
            </Link>
            <Link href={hrefFor(page - 1)} className={linkCls} aria-label="이전">
              ‹
            </Link>
          </>
        ) : (
          <>
            <span className={disabledCls}>«</span>
            <span className={disabledCls}>‹</span>
          </>
        )}
        {pages.map((p) => (
          <Link
            key={p}
            href={hrefFor(p)}
            className={cn(
              linkCls,
              p === page && "bg-gs-navy-900 text-white border-gs-navy-900 hover:bg-gs-navy-800",
            )}
          >
            {p}
          </Link>
        ))}
        {page < totalPages ? (
          <>
            <Link href={hrefFor(page + 1)} className={linkCls} aria-label="다음">
              ›
            </Link>
            <Link href={hrefFor(totalPages)} className={linkCls} aria-label="끝">
              »
            </Link>
          </>
        ) : (
          <>
            <span className={disabledCls}>›</span>
            <span className={disabledCls}>»</span>
          </>
        )}
      </div>
    </div>
  );
}
