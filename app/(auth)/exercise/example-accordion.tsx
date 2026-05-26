"use client";

import type { ExerciseExampleGroup } from "@/lib/exercise-payload";

interface Props {
  groups: ExerciseExampleGroup[];
  onPick: (text: string) => void;
}

export function ExampleAccordion({ groups, onPick }: Props) {
  return (
    <div className="space-y-2">
      {groups.map((g, gi) => (
        <details
          key={gi}
          className="rounded-toss-card border border-gs-line-soft bg-white shadow-toss-card group"
        >
          <summary className="cursor-pointer px-4 py-3 text-[13px] font-bold text-gs-text-strong flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
            <span>{g.title}</span>
            <span className="text-gs-navy-bright text-xs group-open:rotate-180 transition-transform">
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3 grid grid-cols-2 gap-2 max-sm:grid-cols-1">
            {g.items.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onPick(t)}
                className="text-left px-3 py-2 rounded-[10px] border border-gs-line-soft bg-gs-surface-muted hover:bg-gs-navy-50 hover:border-gs-navy-bright text-[12.5px] text-gs-text-soft transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
