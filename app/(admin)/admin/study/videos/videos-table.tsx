"use client";

import { useRef, useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { adminUpsertNotificationVideo } from "@/lib/actions/admin-study";
import {
  confirmVideoUpload,
  requestVideoUploadUrl,
} from "@/lib/actions/admin-daily-video";

export interface VideoRow {
  day_number: number;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_seconds: number | null;
}

export function VideosTable({ rows: initial }: { rows: VideoRow[] }) {
  const [rows, setRows] = useState<VideoRow[]>(initial);
  const [pending, startTransition] = useTransition();
  const [uploadingDay, setUploadingDay] = useState<number | null>(null);
  const [progressMap, setProgressMap] = useState<Record<number, number>>({});
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});
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
        videoUrl: row.video_url,
        durationSeconds: row.duration_seconds,
      });
      toast.show(
        r.ok ? `${row.day_number}일차 저장` : r.error,
        r.ok ? "success" : "error",
      );
    });
  };

  async function handleUpload(idx: number, row: VideoRow, file: File) {
    const dayNumber = row.day_number;
    if (!file.type.startsWith("video/")) {
      toast.show("영상 파일만 업로드 가능합니다", "error");
      return;
    }
    // HEVC(H.265) 사전 차단 — 일부 기기에서 화면이 안 나오고 소리만 재생됨 (7~10일차 실사례)
    const { detectVideoCodec } = await import("@/lib/video/detect-codec");
    const codec = await detectVideoCodec(file);
    if (codec === "hevc") {
      toast.show(
        "이 영상은 HEVC(H.265) 형식이라 일부 기기에서 재생되지 않아요. 촬영 설정을 '높은 호환성(H.264)'으로 바꾸거나, 편집 앱에서 H.264(MP4)로 내보낸 뒤 다시 업로드해주세요.",
        "error",
      );
      return;
    }
    setUploadingDay(dayNumber);
    setProgressMap((p) => ({ ...p, [dayNumber]: 0 }));

    try {
      // 1) presigned PUT URL 발급
      const r1 = await requestVideoUploadUrl(dayNumber, file.type || "video/mp4");
      if (!r1.ok) {
        toast.show(r1.error, "error");
        return;
      }

      // 2) XHR PUT으로 R2 직접 업로드 (진행률 표시)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", r1.uploadUrl);
        xhr.setRequestHeader("Content-Type", r1.contentType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgressMap((p) => ({ ...p, [dayNumber]: pct }));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`R2 ${xhr.status} ${xhr.responseText.slice(0, 200)}`));
        };
        xhr.onerror = () =>
          reject(new Error("네트워크 오류 (CORS 설정을 확인하세요)"));
        xhr.onabort = () => reject(new Error("업로드 취소됨"));
        xhr.send(file);
      });

      // 3) DB 등록
      const r2 = await confirmVideoUpload(dayNumber, r1.objectKey);
      if (!r2.ok) {
        toast.show(r2.error, "error");
        return;
      }
      update(idx, { video_url: r1.objectKey });
      toast.show(`${dayNumber}일차 업로드 완료`, "success");
    } catch (e) {
      toast.show(
        `업로드 실패: ${(e as Error).message}`,
        "error",
      );
    } finally {
      setUploadingDay(null);
      setProgressMap((p) => {
        const next = { ...p };
        delete next[dayNumber];
        return next;
      });
      // input value 리셋 (같은 파일 재업로드 가능하도록)
      const el = fileInputs.current[dayNumber];
      if (el) el.value = "";
    }
  }

  return (
    <div className="bg-white rounded-[14px] border border-gs-line-soft overflow-x-auto">
      <div className="px-3 py-2 text-xs text-gs-warn bg-gs-warn-bg border-b border-gs-warn-border leading-[1.6]">
        ⚠️ 아이폰 기본 촬영 영상(HEVC/H.265)은 업로드해도 일부 기기에서 <b>화면이 검게 나오고 소리만 재생</b>돼요.
        아이폰은 설정 → 카메라 → 포맷을 &ldquo;높은 호환성&rdquo;으로 바꿔 촬영하거나, 편집 앱에서 H.264(MP4)로
        내보낸 뒤 업로드해주세요. 업로드 후에는 꼭 재생 미리보기로 화면이 나오는지 확인!
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gs-surface-muted border-b border-gs-line-soft sticky top-0">
          <tr className="text-left text-xs text-gs-muted">
            <th className="px-3 py-2 w-12">일차</th>
            <th className="px-3 py-2">제목</th>
            <th className="px-3 py-2">R2 객체 키</th>
            <th className="px-3 py-2 w-24">길이(초)</th>
            <th className="px-3 py-2 w-[220px]">업로드</th>
            <th className="px-3 py-2 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isUploading = uploadingDay === row.day_number;
            const progress = progressMap[row.day_number];
            return (
              <tr key={row.day_number} className="border-b border-gs-line-soft">
                <td className="px-3 py-2 text-xs font-bold">{row.day_number}</td>
                <td className="px-3 py-2">
                  <input
                    value={row.title}
                    onChange={(e) => update(idx, { title: e.target.value })}
                    disabled={pending || isUploading}
                    className="w-full px-2 py-1 rounded border border-gs-line-soft text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.video_url ?? ""}
                    onChange={(e) =>
                      update(idx, { video_url: e.target.value || null })
                    }
                    disabled={pending || isUploading}
                    placeholder="video/day-1.mp4"
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
                    disabled={pending || isUploading}
                    className="w-full px-2 py-1 rounded border border-gs-line-soft text-xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <input
                      ref={(el) => {
                        fileInputs.current[row.day_number] = el;
                      }}
                      type="file"
                      accept="video/mp4,video/*"
                      disabled={pending || isUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(idx, row, f);
                      }}
                      className="text-xs"
                    />
                    {isUploading && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-gs-line-soft rounded overflow-hidden">
                          <div
                            className="h-full bg-gs-blue transition-all"
                            style={{ width: `${progress ?? 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gs-muted whitespace-nowrap">
                          {progress ?? 0}%
                        </span>
                      </div>
                    )}
                    {row.video_url && !isUploading && (
                      <span className="text-[10px] text-gs-muted font-mono truncate">
                        {row.video_url}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => save(row)}
                    disabled={pending || isUploading}
                    className="px-2 py-1 rounded bg-gs-blue text-white text-xs font-bold disabled:opacity-50"
                  >
                    저장
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
