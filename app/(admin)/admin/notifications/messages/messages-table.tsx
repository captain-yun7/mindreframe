"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { adminUpdateNotificationMessage } from "@/lib/actions/admin-notifications";

interface Row {
  day_number: number;
  title: string | null;
  content: string;
}

export function MessagesTable({ rows: initial }: { rows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [dirty, setDirty] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const filtered = rows.filter((r) => {
    if (!filter) return true;
    const term = filter.toLowerCase();
    return (
      String(r.day_number).includes(term) || r.content.toLowerCase().includes(term)
    );
  });

  const updateContent = (day: number, content: string) => {
    setRows((prev) =>
      prev.map((r) => (r.day_number === day ? { ...r, content } : r)),
    );
    setDirty((prev) => {
      const next = new Set(prev);
      next.add(day);
      return next;
    });
  };

  const save = (row: Row) => {
    if (row.content.length > 200) {
      toast.show("본문은 200자 이내", "error");
      return;
    }
    startTransition(async () => {
      const r = await adminUpdateNotificationMessage({
        dayNumber: row.day_number,
        title: row.title,
        content: row.content,
      });
      if (r.ok) {
        toast.show(`${row.day_number}일차 저장됨`, "success");
        setDirty((prev) => {
          const next = new Set(prev);
          next.delete(row.day_number);
          return next;
        });
      } else {
        toast.show(r.error, "error");
      }
    });
  };

  return (
    <>
      <div className="mb-4">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="일차 또는 본문 검색"
          className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
        />
        {filter ? (
          <p className="mt-2 text-xs text-gs-muted">검색 결과 {filtered.length}개</p>
        ) : null}
      </div>

      <div className="bg-white rounded-[14px] border border-gs-line-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gs-surface-muted border-b border-gs-line-soft">
            <tr className="text-left text-xs text-gs-muted">
              <th className="px-3 py-2 w-12">일차</th>
              <th className="px-3 py-2">본문</th>
              <th className="px-3 py-2 w-16">길이</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-gs-muted">
                  결과 없음
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const isDirty = dirty.has(row.day_number);
                const overLimit = row.content.length > 200;
                return (
                  <tr
                    key={row.day_number}
                    className={`border-b border-gs-line-soft ${
                      isDirty ? "bg-gs-blue-light/30" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-xs font-bold align-top">
                      {row.day_number}
                    </td>
                    <td className="px-3 py-2">
                      <textarea
                        value={row.content}
                        onChange={(e) => updateContent(row.day_number, e.target.value)}
                        disabled={pending}
                        rows={2}
                        className="w-full px-2 py-1 rounded border border-gs-line-soft text-sm resize-none"
                      />
                    </td>
                    <td
                      className={`px-3 py-2 text-xs text-center align-top ${
                        overLimit ? "text-gs-danger font-bold" : "text-gs-muted"
                      }`}
                    >
                      {row.content.length}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <button
                        onClick={() => save(row)}
                        disabled={pending || !isDirty}
                        className="px-2 py-1 rounded bg-gs-blue text-white text-xs font-bold disabled:opacity-40"
                      >
                        저장
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
