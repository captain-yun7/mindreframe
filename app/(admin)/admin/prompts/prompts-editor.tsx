"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { adminUpdatePrompt } from "@/lib/actions/admin-settings";

interface PromptItem {
  key: string;
  label: string;
  description: string;
  initialValue: string;
  source: "db" | "fallback";
  fallbackValue: string;
  placeholders?: readonly string[];
}

interface Props {
  items: PromptItem[];
}

/**
 * J3 / F144 — 운영자가 site_settings의 prompt_* 4개 키를 textarea로 직접 편집.
 * 빈 값으로 저장하면 코드 fallback으로 자동 복귀.
 */
export function PromptsEditor({ items }: Props) {
  return (
    <div className="space-y-4">
      {items.map((p) => (
        <PromptCard key={p.key} item={p} />
      ))}
    </div>
  );
}

function PromptCard({ item }: { item: PromptItem }) {
  const [value, setValue] = useState(item.initialValue);
  const [showFallback, setShowFallback] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleSave() {
    startTransition(async () => {
      const r = await adminUpdatePrompt(item.key, value);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("프롬프트를 저장했어요", "success");
    });
  }

  function handleResetToFallback() {
    if (!confirm("코드 fallback으로 되돌리시겠어요? 현재 입력값은 사라져요.")) return;
    setValue("");
    startTransition(async () => {
      const r = await adminUpdatePrompt(item.key, "");
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("코드 fallback으로 복원했어요", "success");
    });
  }

  const charCount = value.length;
  const isUsingFallback = !value.trim();

  return (
    <div className="rounded-toss-card border border-gs-line-soft bg-white p-4">
      <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
        <div>
          <div className="font-bold text-sm flex items-center gap-2">
            {item.label}
            <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gs-surface-muted text-gs-muted">
              {item.key}
            </code>
            {isUsingFallback ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                코드 fallback 사용 중
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                DB 값 사용 중
              </span>
            )}
          </div>
          <div className="text-xs text-gs-muted-soft mt-1">{item.description}</div>
        </div>
        <div className="text-[11px] text-gs-muted">{charCount.toLocaleString()}자</div>
      </div>

      {item.placeholders && item.placeholders.length > 0 && (
        <div className="mb-2 text-[11px] text-gs-muted bg-gs-surface-muted rounded px-2 py-1.5">
          치환 가능한 placeholder:{" "}
          {item.placeholders.map((p) => (
            <code
              key={p}
              className="font-mono mr-1 px-1 py-0.5 rounded bg-white border border-gs-line-soft"
            >
              {p}
            </code>
          ))}
        </div>
      )}

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={16}
        placeholder="비우면 코드의 fallback prompt가 사용됩니다."
        className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-[12px] font-mono leading-[1.55] focus:outline-none focus:ring-2 focus:ring-gs-blue/40 whitespace-pre"
      />

      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="px-4 py-2 rounded-[10px] bg-gs-blue text-white text-xs font-bold disabled:opacity-50"
          >
            저장
          </button>
          <button
            type="button"
            onClick={handleResetToFallback}
            disabled={pending}
            className="px-3 py-2 rounded-[10px] bg-white border border-gs-line-soft text-xs disabled:opacity-50"
          >
            코드 fallback으로 복원
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowFallback((v) => !v)}
          className="text-[11px] text-gs-blue hover:underline"
        >
          {showFallback ? "fallback 숨기기" : "코드 fallback 보기"}
        </button>
      </div>

      {showFallback && (
        <div className="mt-2 rounded-[10px] bg-gs-surface-muted border border-gs-line-soft p-3">
          <div className="text-[11px] text-gs-muted mb-1">코드 fallback (lib/cbt/prompts.ts)</div>
          <pre className="text-[11px] whitespace-pre-wrap leading-[1.55] max-h-[300px] overflow-y-auto">
            {item.fallbackValue}
          </pre>
        </div>
      )}
    </div>
  );
}
