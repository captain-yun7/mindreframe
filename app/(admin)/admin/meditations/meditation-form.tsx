"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  adminCreateMeditation,
  adminUpdateMeditation,
  adminDeleteMeditation,
} from "@/lib/actions/admin-meditations";
import { requestMeditationAudioUploadUrl } from "@/lib/actions/admin-meditation-audio";

type Category = "person" | "nature" | "music";

interface Props {
  mode: "create" | "edit";
  initial?: {
    id: string;
    slug: string;
    category: Category;
    title: string;
    description: string;
    durationSeconds: number;
    audioUrl: string;
    videoId: string;
    orderIndex: number;
    requiredPlan: "" | "pro";
  };
}

export function MeditationForm({ mode, initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "person");
  const [title, setTitle] = useState(initial?.title ?? "");

  // slug 자동 생성 — 한글 제목은 영문화 불가하므로 카테고리 + 랜덤 suffix.
  function autoSlug(cat: Category): string {
    const rand = Math.random().toString(36).slice(2, 8);
    return `${cat}-${rand}`;
  }
  const [description, setDescription] = useState(initial?.description ?? "");
  const [durationSeconds, setDurationSeconds] = useState<number>(
    initial?.durationSeconds ?? 180,
  );
  const [audioUrl, setAudioUrl] = useState(initial?.audioUrl ?? "");
  const [videoId, setVideoId] = useState(initial?.videoId ?? "");
  const [orderIndex, setOrderIndex] = useState<number>(initial?.orderIndex ?? 1);
  const [requiredPlan, setRequiredPlan] = useState<"" | "pro">(
    initial?.requiredPlan ?? "",
  );

  // 음원 파일 업로드 (영상 업로드와 동일 패턴)
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAudioUpload(file: File) {
    // slug 비어있으면 자동 생성 (카테고리 + 랜덤)
    let useSlug = slug.trim();
    if (!useSlug) {
      useSlug = autoSlug(category);
      setSlug(useSlug);
    }
    setUploading(true);
    setUploadPct(0);
    try {
      const r1 = await requestMeditationAudioUploadUrl(
        useSlug,
        file.type || "audio/mpeg",
      );
      if (!r1.ok) {
        toast.show(r1.error, "error");
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", r1.uploadUrl);
        xhr.setRequestHeader("Content-Type", r1.contentType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadPct(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`R2 ${xhr.status} ${xhr.responseText.slice(0, 200)}`));
        };
        xhr.onerror = () => reject(new Error("네트워크 오류 (CORS 설정 확인)"));
        xhr.send(file);
      });
      setAudioUrl(r1.publicUrl);
      toast.show("음원 업로드 완료 — 아래 등록/저장을 눌러주세요", "success");
    } catch (e) {
      toast.show(`업로드 실패: ${(e as Error).message}`, "error");
    } finally {
      setUploading(false);
      setUploadPct(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleSubmit = () => {
    const payload = {
      slug: slug.trim(),
      category,
      title: title.trim(),
      description: description.trim() || null,
      durationSeconds,
      audioUrl: audioUrl.trim() || null,
      videoId: videoId.trim() || null,
      orderIndex,
      requiredPlan: requiredPlan || null,
    };
    startTransition(async () => {
      const r =
        mode === "create"
          ? await adminCreateMeditation(payload)
          : await adminUpdateMeditation(initial!.id, payload);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("저장됨", "success");
      router.push("/admin/meditations");
    });
  };

  const handleDelete = () => {
    if (!initial) return;
    if (!confirm(`"${initial.title}"을(를) 정말 삭제할까요?`)) return;
    startTransition(async () => {
      const r = await adminDeleteMeditation(initial.id);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("삭제됨", "success");
      router.push("/admin/meditations");
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <Field label="slug (비워두면 업로드 시 자동 생성)">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="자동 생성됨 (직접 입력도 가능)"
            disabled={pending || uploading}
            className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm font-mono"
          />
        </Field>
        <Field label="카테고리">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            disabled={pending}
            className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
          >
            <option value="person">사람(가이드)</option>
            <option value="nature">자연</option>
            <option value="music">음악</option>
          </select>
        </Field>
      </div>

      <Field label="제목">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={pending}
          className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
        />
      </Field>

      <Field label="설명 (description)">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          rows={3}
          className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
        />
      </Field>

      <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
        <Field label="길이 (초, 30~3600)">
          <input
            type="number"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value))}
            disabled={pending}
            min={30}
            max={3600}
            className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
          />
        </Field>
        <Field label="순서 (order_index)">
          <input
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(Number(e.target.value))}
            disabled={pending}
            className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
          />
        </Field>
        <Field label="유료 게이트">
          <select
            value={requiredPlan}
            onChange={(e) => setRequiredPlan(e.target.value as "" | "pro")}
            disabled={pending}
            className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
          >
            <option value="">전체 공개</option>
            <option value="pro">프로 이상만</option>
          </select>
        </Field>
      </div>

      <Field label="음원 파일 업로드 (mp3/wav/m4a — slug 입력 후 선택)">
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/*"
            disabled={pending || uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleAudioUpload(f);
            }}
            className="text-sm"
          />
          {uploading && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gs-line-soft rounded overflow-hidden">
                <div
                  className="h-full bg-gs-blue transition-all"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
              <span className="text-[11px] text-gs-muted whitespace-nowrap">
                {uploadPct}%
              </span>
            </div>
          )}
        </div>
      </Field>

      <Field label="오디오 URL (위에서 업로드하면 자동 입력 — 직접 입력도 가능)">
        <input
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          disabled={pending || uploading}
          placeholder="https://pub-...r2.dev/audio/..."
          className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm font-mono"
        />
      </Field>

      <Field label="Cloudflare Stream UID (선택 — 영상 명상 차후 지원)">
        <input
          value={videoId}
          onChange={(e) => setVideoId(e.target.value)}
          disabled={pending}
          placeholder="예: 5d5bc37ffcf54c9b9e0d5b9b75fcf7c8"
          className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm font-mono"
        />
      </Field>

      <p className="text-xs text-gs-muted">
        오디오 URL 또는 Cloudflare Stream UID 중 하나는 필수입니다.
      </p>

      <div className="flex items-center justify-between pt-4">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="px-4 py-2 rounded-[10px] bg-gs-danger-bg text-gs-danger text-sm font-bold border border-gs-danger-border"
          >
            삭제
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || uploading}
          className="px-6 py-2 rounded-[10px] bg-gs-blue text-white text-sm font-bold disabled:opacity-50"
        >
          {pending ? "저장 중..." : mode === "create" ? "등록" : "저장"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-gs-muted mb-1">{label}</span>
      {children}
    </label>
  );
}
