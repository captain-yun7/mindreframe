import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  /** th/td 추가 클래스 */
  className?: string;
  /** 모바일에서 숨김 */
  hideOnMobile?: boolean;
}

/**
 * 어드민 공용 테이블 (서버 렌더 가능 — cell은 render 함수).
 * 행 클릭 네비게이션은 cell 안에 <Link>로 처리(서버 친화).
 * 다중선택이 필요하면 selectable-table.tsx(client) 사용.
 */
export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  rowClassName,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: { title: string; desc?: string };
  rowClassName?: (row: T) => string | undefined;
}) {
  return (
    <div className="bg-white rounded-[14px] border border-gs-line-soft overflow-x-auto shadow-gs-card">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gs-surface-muted border-b border-gs-line-soft">
          <tr className="text-left text-xs text-gs-muted font-bold">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-3 py-2.5 font-bold whitespace-nowrap",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  c.hideOnMobile && "max-sm:hidden",
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                <EmptyState
                  title={empty?.title ?? "데이터가 없습니다"}
                  desc={empty?.desc}
                />
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  "border-b border-gs-line-soft last:border-0 hover:bg-gs-surface-muted/50 transition-colors",
                  rowClassName?.(row),
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-3 py-2.5 align-middle",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.hideOnMobile && "max-sm:hidden",
                      c.className,
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
