"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { adminUpdateSiteSetting } from "@/lib/actions/admin-settings";

interface Row {
  key: string;
  value: string;
  description: string | null;
}

const LONG_VALUE_KEYS = new Set(["terms_html", "privacy_html"]);
const READONLY_KEYS = new Set(["footer_address"]);

export function SettingsForm({ rows: initial }: { rows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [preview, setPreview] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const updateValue = (key: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, value } : r)));
    setDirty((prev) => new Set(prev).add(key));
  };

  const togglePreview = (key: string) => {
    setPreview((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = (row: Row) => {
    startTransition(async () => {
      const r = await adminUpdateSiteSetting(row.key, row.value);
      if (r.ok) {
        toast.show(`${row.key} 저장됨`, "success");
        setDirty((prev) => {
          const next = new Set(prev);
          next.delete(row.key);
          return next;
        });
      } else {
        toast.show(r.error, "error");
      }
    });
  };

  return (
    <div className="space-y-4 mt-6">
      {rows.map((row) => {
        const isLong = LONG_VALUE_KEYS.has(row.key);
        const isReadonly = READONLY_KEYS.has(row.key);
        const showPreview = preview.has(row.key);
        const isDirty = dirty.has(row.key);

        return (
          <div
            key={row.key}
            className={`bg-white rounded-[14px] border p-4 ${
              isDirty ? "border-gs-blue" : "border-gs-line-soft"
            }`}
          >
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <div className="min-w-0">
                <code className="text-xs font-mono bg-gs-surface-mid px-1.5 py-0.5 rounded">
                  {row.key}
                </code>
                {row.description ? (
                  <span className="ml-2 text-xs text-gs-muted">{row.description}</span>
                ) : null}
                {isReadonly ? (
                  <span className="ml-2 text-[11px] text-gs-warn">(Sprint C 보류)</span>
                ) : null}
              </div>
              <div className="flex gap-2 shrink-0">
                {isLong ? (
                  <button
                    type="button"
                    onClick={() => togglePreview(row.key)}
                    className="text-xs text-gs-blue hover:underline"
                  >
                    {showPreview ? "편집" : "미리보기"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => save(row)}
                  disabled={pending || isReadonly || !isDirty}
                  className="px-3 py-1 rounded bg-gs-blue text-white text-xs font-bold disabled:opacity-40"
                >
                  저장
                </button>
              </div>
            </div>

            {isLong ? (
              showPreview ? (
                <div
                  className="prose prose-sm max-w-none p-3 bg-gs-surface-muted rounded border border-gs-line-soft min-h-[100px] overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: row.value }}
                />
              ) : (
                <textarea
                  value={row.value}
                  onChange={(e) => updateValue(row.key, e.target.value)}
                  disabled={pending || isReadonly}
                  rows={16}
                  className="w-full px-3 py-2 rounded border border-gs-line-soft text-sm font-mono"
                />
              )
            ) : (
              <input
                value={row.value}
                onChange={(e) => updateValue(row.key, e.target.value)}
                disabled={pending || isReadonly}
                className="w-full px-3 py-2 rounded border border-gs-line-soft text-sm"
                placeholder={isReadonly ? "(값 변경 보류 중)" : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
