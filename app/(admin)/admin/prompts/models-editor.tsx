"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { adminUpdateModel } from "@/lib/actions/admin-settings";

interface ModelItem {
  key: "model_analyzer" | "model_therapy" | "model_trash";
  label: string;
  description: string;
  initialValue: string;
  source: "db" | "default";
  defaultValue: string;
}

interface ModelOption {
  value: string;
  label: string;
}

interface Props {
  items: ModelItem[];
  options: readonly ModelOption[];
}

/**
 * F216 — AI 모델 어드민 선택. 빈 값(="default 사용")도 옵션으로 제공.
 * 각 단계별로 독립 저장 + 캐시 즉시 무효화.
 */
export function ModelsEditor({ items, options }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {items.map((m) => (
        <ModelCard key={m.key} item={m} options={options} />
      ))}
    </div>
  );
}

function ModelCard({
  item,
  options,
}: {
  item: ModelItem;
  options: readonly ModelOption[];
}) {
  const [value, setValue] = useState(item.initialValue);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const isUsingDefault = !value.trim();

  function handleSave() {
    startTransition(async () => {
      const r = await adminUpdateModel(item.key, value);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show(
        isUsingDefault
          ? "코드 default로 복원했어요"
          : "모델을 저장했어요",
        "success",
      );
    });
  }

  return (
    <div className="rounded-toss-card border border-gs-line-soft bg-white p-3">
      <div className="font-bold text-sm flex items-center gap-2 mb-1">
        {item.label}
        {isUsingDefault ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
            default
          </span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
            DB
          </span>
        )}
      </div>
      <div className="text-[11px] text-gs-muted-soft mb-2">{item.description}</div>
      <div className="text-[10px] text-gs-muted mb-2">
        코드 default: <code className="font-mono">{item.defaultValue}</code>
      </div>

      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full px-2 py-2 rounded-[10px] border border-gs-line-soft text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gs-blue/40"
      >
        <option value="">(코드 default 사용)</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleSave}
        disabled={pending || value === item.initialValue}
        className="mt-2 w-full px-3 py-2 rounded-[10px] bg-gs-blue text-white text-xs font-bold disabled:opacity-40"
      >
        저장
      </button>
    </div>
  );
}
