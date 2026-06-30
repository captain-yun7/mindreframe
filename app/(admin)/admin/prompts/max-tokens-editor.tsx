"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { adminUpdateMaxTokens } from "@/lib/actions/admin-settings";

interface MaxTokensItem {
  key: "max_tokens_analyzer" | "max_tokens_therapy" | "max_tokens_trash";
  label: string;
  description: string;
  initialValue: string;       // DB raw 값 ("" / "0" / "1000")
  source: "db" | "default";
  defaultValue: number;       // 코드 default (1000 / 2000)
  effective: number | undefined; // 실제 적용 값 (undefined = 무제한)
}

interface Props {
  items: MaxTokensItem[];
}

/**
 * F249 — max_tokens 어드민 편집.
 * 빈값(코드 default 사용) / 0(무제한) / 정수(직접 지정).
 */
export function MaxTokensEditor({ items }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {items.map((m) => (
        <MaxTokensCard key={m.key} item={m} />
      ))}
    </div>
  );
}

function MaxTokensCard({ item }: { item: MaxTokensItem }) {
  const [value, setValue] = useState(item.initialValue);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const trimmed = value.trim();
  const usingDefault = trimmed === "";
  const unlimited = trimmed === "0";

  function handleSave() {
    startTransition(async () => {
      const r = await adminUpdateMaxTokens(item.key, value);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("max_tokens 저장 완료", "success");
    });
  }

  return (
    <div className="rounded-toss-card border border-gs-line-soft bg-white p-3">
      <div className="font-bold text-sm flex items-center gap-2 mb-1">
        {item.label}
        {usingDefault ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
            default
          </span>
        ) : unlimited ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold">
            ∞ 무제한
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
        {" · "}현재 실제: <code className="font-mono">{item.effective ?? "무제한"}</code>
      </div>

      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="빈값=default, 0=무제한"
        className="w-full px-2 py-2 rounded-[10px] border border-gs-line-soft text-sm focus:outline-none focus:ring-2 focus:ring-gs-blue/40"
      />

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
