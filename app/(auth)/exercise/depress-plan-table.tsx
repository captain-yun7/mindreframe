"use client";

import type { DepressPlanItem } from "@/lib/exercise-payload";

interface Props {
  rows: DepressPlanItem[];
  selectedIndex: number | null;
  onChange: (idx: number, key: keyof DepressPlanItem, value: string) => void;
  onSelect: (idx: number) => void;
  onClear: (idx: number) => void;
}

const inputCls =
  "w-full px-2 py-1.5 border border-gs-line-soft rounded-[10px] text-[12.5px] outline-none focus:border-gs-navy-bright focus:ring-2 focus:ring-gs-navy-bright/20 transition-colors bg-white";

export function DepressPlanTable({
  rows,
  selectedIndex,
  onChange,
  onSelect,
  onClear,
}: Props) {
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full text-[12px] border-collapse min-w-[520px]">
        <thead>
          <tr className="bg-gs-navy-50 text-gs-navy-bright">
            <th className="px-2 py-2 text-center w-10">선택</th>
            <th className="px-2 py-2 text-center w-8">#</th>
            <th className="px-2 py-2 text-left">활동(계획)</th>
            <th className="px-2 py-2 text-center w-24">
              실행 난이도
              <span className="block text-[10px] font-normal text-gs-muted">0~100</span>
            </th>
            <th className="px-2 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={idx}
              className={`border-b border-gs-line-soft ${
                selectedIndex === idx ? "bg-gs-gold-50" : ""
              }`}
            >
              <td className="px-2 py-2 text-center">
                <input
                  type="radio"
                  name="depRow"
                  checked={selectedIndex === idx}
                  onChange={() => onSelect(idx)}
                  disabled={!r.activity.trim()}
                  className="cursor-pointer accent-gs-navy-bright disabled:opacity-30"
                />
              </td>
              <td className="px-2 py-2 text-center text-gs-muted">{idx + 1}</td>
              <td className="px-2 py-2">
                <input
                  type="text"
                  value={r.activity}
                  onChange={(e) => onChange(idx, "activity", e.target.value)}
                  className={inputCls}
                  data-k="activity"
                  data-row={idx}
                  placeholder="예) 10분 산책"
                />
              </td>
              <td className="px-2 py-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={r.diff}
                  onChange={(e) => onChange(idx, "diff", e.target.value)}
                  className={inputCls}
                  placeholder="0~100"
                />
              </td>
              <td className="px-2 py-2 text-center">
                <button
                  type="button"
                  onClick={() => onClear(idx)}
                  className="text-gs-muted hover:text-gs-danger text-base leading-none"
                  aria-label={`${idx + 1}행 비우기`}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
