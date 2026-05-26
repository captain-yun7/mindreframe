"use client";

import type { AnxietyPlanItem } from "@/lib/exercise-payload";

interface Props {
  rows: AnxietyPlanItem[];
  selectedIndex: number | null;
  onChange: (idx: number, key: keyof AnxietyPlanItem, value: string) => void;
  onSelect: (idx: number) => void;
  onClear: (idx: number) => void;
}

const inputCls =
  "w-full px-2 py-1.5 border border-gs-line-soft rounded-[10px] text-[12.5px] outline-none focus:border-gs-navy-bright focus:ring-2 focus:ring-gs-navy-bright/20 transition-colors bg-white";

export function AnxietyPlanTable({
  rows,
  selectedIndex,
  onChange,
  onSelect,
  onClear,
}: Props) {
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full text-[12px] border-collapse min-w-[820px]">
        <thead>
          <tr className="bg-gs-navy-50 text-gs-navy-bright">
            <th className="px-2 py-2 text-center w-10">선택</th>
            <th className="px-2 py-2 text-center w-8">#</th>
            <th className="px-2 py-2 text-left">상황</th>
            <th className="px-2 py-2 text-center w-24">
              불안점수
              <span className="block text-[10px] font-normal text-gs-muted">0~100</span>
            </th>
            <th className="px-2 py-2 text-center w-20">
              피한 순위
              <span className="block text-[10px] font-normal text-gs-muted">1~10</span>
            </th>
            <th className="px-2 py-2 text-left w-[180px]">자동사고</th>
            <th className="px-2 py-2 text-left w-[180px]">합리적 사고</th>
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
                  name="anxRow"
                  checked={selectedIndex === idx}
                  onChange={() => onSelect(idx)}
                  disabled={!r.situation.trim()}
                  className="cursor-pointer accent-gs-navy-bright disabled:opacity-30"
                />
              </td>
              <td className="px-2 py-2 text-center text-gs-muted">{idx + 1}</td>
              <td className="px-2 py-2">
                <input
                  type="text"
                  value={r.situation}
                  onChange={(e) => onChange(idx, "situation", e.target.value)}
                  className={inputCls}
                  data-k="situation"
                  data-row={idx}
                  placeholder="예) 회의에서 말하기"
                />
              </td>
              <td className="px-2 py-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={r.expected}
                  onChange={(e) => onChange(idx, "expected", e.target.value)}
                  className={inputCls}
                  placeholder="0~100"
                />
              </td>
              <td className="px-2 py-2">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={r.rank}
                  onChange={(e) => onChange(idx, "rank", e.target.value)}
                  className={inputCls}
                  placeholder="1~10"
                />
              </td>
              <td className="px-2 py-2">
                <textarea
                  rows={2}
                  value={r.auto}
                  onChange={(e) => onChange(idx, "auto", e.target.value)}
                  className={inputCls + " resize-y"}
                  placeholder="자동사고"
                />
              </td>
              <td className="px-2 py-2">
                <textarea
                  rows={2}
                  value={r.rational}
                  onChange={(e) => onChange(idx, "rational", e.target.value)}
                  className={inputCls + " resize-y"}
                  placeholder="합리적 사고"
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
