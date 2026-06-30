import { cn } from "@/lib/utils";

export interface FilterConfig {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}

/**
 * 서버 렌더 검색/필터 바 — GET form. 제출 시 page 파라미터를 빼서 1페이지로 리셋.
 * 자동제출이 필요 없으면(검색 버튼 클릭) 이 컴포넌트로 충분.
 */
export function SearchFilterBar({
  action,
  searchName = "q",
  searchValue = "",
  searchPlaceholder = "검색",
  hideSearch = false,
  filters = [],
  className,
}: {
  action: string;
  searchName?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  hideSearch?: boolean;
  filters?: FilterConfig[];
  className?: string;
}) {
  return (
    <form
      method="GET"
      action={action}
      className={cn(
        "flex flex-wrap items-center gap-2 mb-4 bg-white rounded-[14px] border border-gs-line-soft p-3 shadow-gs-card",
        className,
      )}
    >
      {hideSearch ? (
        <div className="flex-1 min-w-[120px] text-sm text-gs-muted font-bold pl-1">필터</div>
      ) : (
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gs-muted-light text-sm">
            ⌕
          </span>
          <input
            type="text"
            name={searchName}
            defaultValue={searchValue}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-3 py-2 rounded-[10px] border border-gs-line-soft text-sm focus:outline-none focus:ring-2 focus:ring-gs-blue/40"
          />
        </div>
      )}
      {filters.map((f) => (
        <select
          key={f.name}
          name={f.name}
          defaultValue={f.value}
          aria-label={f.label}
          className="px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gs-blue/40"
        >
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      <button
        type="submit"
        className="px-4 py-2 rounded-[10px] bg-gs-navy-900 text-white text-sm font-bold hover:bg-gs-navy-800 transition-colors"
      >
        적용
      </button>
    </form>
  );
}
