"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  adminCreateMeditation,
  adminUpdateMeditation,
  adminDeleteMeditation,
} from "@/lib/actions/admin-meditations";

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
        <Field label="slug (영문/숫자/하이픈)">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="예: nature-rain"
            disabled={pending}
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

      <Field label="오디오 URL (R2 public URL — Cloudflare R2 대시보드에서 업로드 후 복사)">
        <input
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          disabled={pending}
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
          disabled={pending}
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
