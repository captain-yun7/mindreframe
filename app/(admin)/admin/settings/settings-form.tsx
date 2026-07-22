"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { adminUpdateSiteSetting } from "@/lib/actions/admin-settings";

interface Row {
  key: string;
  value: string;
  description: string | null;
}

const LONG_VALUE_KEYS = new Set([
  "terms_html",
  "privacy_html",
  "landing_hero_title",
  "landing_hero_subtitle",
  "landing_menu_items",
  "landing_stats",
  "landing_final_cta",
  "dashboard_hero_subtitle",
  "trash_hero_subtitle",
  "progress_hero_subtitle",
  "chat_hero_subtitle",
  "exercise_hero_subtitle",
  "meditation_hero_subtitle",
  "popup_trash_intro",
  "popup_chat_intro",
  "popup_meditation_focus",
  "popup_exercise_step1",
  "popup_exercise_step2",
  "popup_exercise_step3",
  "popup_exercise_step4_praise",
]);
const JSON_KEYS = new Set([
  "landing_menu_items",
  "landing_stats",
  "landing_final_cta",
  "popup_trash_intro",
  "popup_chat_intro",
  "popup_meditation_focus",
  "popup_exercise_step1",
  "popup_exercise_step2",
  "popup_exercise_step3",
  "popup_exercise_step4_praise",
]);
const HTML_KEYS = new Set(["terms_html", "privacy_html"]);
const READONLY_KEYS = new Set<string>([]);

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
    // JSON 키는 client에서도 사전 검증 (서버에서도 한번 더 검증)
    if (JSON_KEYS.has(row.key) && row.value.trim()) {
      try {
        JSON.parse(row.value);
      } catch {
        toast.show(`${row.key}: JSON 형식 오류`, "error");
        return;
      }
    }
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
        // JSON 값은 라이브 편집 위험(문법 깨지면 페이지 손상) → 읽기전용 잠금.
        // 약관·방침(HTML)은 운영자가 직접 수정해야 해서 편집 허용 (미리보기로 확인 가능).
        const isLocked = JSON_KEYS.has(row.key);
        const isReadonly = READONLY_KEYS.has(row.key) || isLocked;
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
                {READONLY_KEYS.has(row.key) ? (
                  <span className="ml-2 text-[11px] text-gs-warn">(Sprint C 보류)</span>
                ) : null}
                {isLocked ? (
                  <span className="ml-2 text-[11px] font-bold text-gs-muted">
                    🔒 읽기전용 · 코드/배포로만
                  </span>
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
                HTML_KEYS.has(row.key) ? (
                  <div
                    className="prose prose-sm max-w-none p-3 bg-gs-surface-muted rounded border border-gs-line-soft min-h-[100px] overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: row.value }}
                  />
                ) : JSON_KEYS.has(row.key) ? (
                  (() => {
                    let parsed: unknown;
                    let err: string | null = null;
                    try {
                      parsed = JSON.parse(row.value);
                    } catch (e) {
                      err = e instanceof Error ? e.message : "JSON 파싱 실패";
                    }
                    if (err) {
                      return (
                        <pre className="p-3 bg-gs-warn-bg border border-gs-warn-border rounded text-xs text-gs-warn whitespace-pre-wrap">
                          JSON 형식 오류: {err}
                        </pre>
                      );
                    }
                    return (
                      <pre className="p-3 bg-gs-surface-muted rounded border border-gs-line-soft text-xs overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(parsed, null, 2)}
                      </pre>
                    );
                  })()
                ) : (
                  <div className="p-3 bg-gs-surface-muted rounded border border-gs-line-soft text-sm whitespace-pre-wrap">
                    {row.value}
                  </div>
                )
              ) : (
                <textarea
                  value={row.value}
                  onChange={(e) => updateValue(row.key, e.target.value)}
                  disabled={pending || isReadonly}
                  rows={HTML_KEYS.has(row.key) ? 16 : JSON_KEYS.has(row.key) ? 8 : 4}
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
