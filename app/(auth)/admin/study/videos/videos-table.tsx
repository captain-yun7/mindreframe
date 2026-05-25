"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { adminUpsertNotificationVideo } from "@/lib/actions/admin-study";

export interface VideoRow {
  day_number: number;
  title: string;
  description: string | null;
  video_id: string | null;
  duration_seconds: number | null;
}

export function VideosTable({ rows: initial }: { rows: VideoRow[] }) {
  const [rows, setRows] = useState<VideoRow[]>(initial);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const update = (idx: number, patch: Partial<VideoRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const save = (row: VideoRow) => {
    startTransition(async () => {
      const r = await adminUpsertNotificationVideo({
        dayNumber: row.day_number,
        title: row.title,
        description: row.description,
        videoId: row.video_id,
        durationSeconds: row.duration_seconds,
      });
      toast.show(
        r.ok ? `${row.day_number}일차 저장` : r.error,
        r.ok ? "success" : "error",
      );
    });
  };

  return (
    <div className="bg-white rounded-[14px] border border-gs-line-soft overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gs-surface-muted border-b border-gs-line-soft sticky top-0">
          <tr className="text-left text-xs text-gs-muted">
            <th className="px-3 py-2 w-12">일차</th>
            <th className="px-3 py-2">제목</th>
            <th className="px-3 py-2">Cloudflare Stream UID</th>
            <th className="px-3 py-2 w-24">길이(초)</th>
            <th className="px-3 py-2 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.day_number} className="border-b border-gs-line-soft">
              <td className="px-3 py-2 text-xs font-bold">{row.day_number}</td>
              <td className="px-3 py-2">
                <input
                  value={row.title}
                  onChange={(e) => update(idx, { title: e.target.value })}
                  disabled={pending}
                  className="w-full px-2 py-1 rounded border border-gs-line-soft text-sm"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  value={row.video_id ?? ""}
                  onChange={(e) => update(idx, { video_id: e.target.value || null })}
                  disabled={pending}
                  placeholder="32자 hex"
                  className="w-full px-2 py-1 rounded border border-gs-line-soft text-xs font-mono"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  value={row.duration_seconds ?? ""}
                  onChange={(e) =>
                    update(idx, {
                      duration_seconds: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  disabled={pending}
                  className="w-full px-2 py-1 rounded border border-gs-line-soft text-xs"
                />
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => save(row)}
                  disabled={pending}
                  className="px-2 py-1 rounded bg-gs-blue text-white text-xs font-bold disabled:opacity-50"
                >
                  저장
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
