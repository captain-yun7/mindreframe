"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  adminCreateStudyArticle,
  adminUpdateStudyArticle,
  adminDeleteStudyArticle,
} from "@/lib/actions/admin-study";

type Category = "core" | "distortion" | "body" | "avoidance" | "rumination";

interface Props {
  mode: "create" | "edit";
  initial?: {
    id: string;
    slug: string;
    category: Category;
    title: string;
    sub: string;
    bodyHtml: string;
    orderIndex: number;
    videoId: string;
    requiredPlan: "" | "pro";
  };
}

export function StudyForm({ mode, initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState(false);

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "core");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [sub, setSub] = useState(initial?.sub ?? "");
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? "");
  const [orderIndex, setOrderIndex] = useState<number>(initial?.orderIndex ?? 1);
  const [videoId, setVideoId] = useState(initial?.videoId ?? "");
  const [requiredPlan, setRequiredPlan] = useState<"" | "pro">(
    initial?.requiredPlan ?? "",
  );

  const handleSubmit = () => {
    const payload = {
      slug: slug.trim(),
      category,
      title: title.trim(),
      sub: sub.trim() || null,
      bodyHtml,
      orderIndex,
      videoId: videoId.trim() || null,
      requiredPlan: requiredPlan || null,
    };
    startTransition(async () => {
      const r =
        mode === "create"
          ? await adminCreateStudyArticle(payload)
          : await adminUpdateStudyArticle(initial!.id, payload);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("저장됨", "success");
      router.push("/admin/study");
    });
  };

  const handleDelete = () => {
    if (!initial) return;
    if (!confirm(`"${initial.title}"을(를) 정말 삭제할까요?`)) return;
    startTransition(async () => {
      const r = await adminDeleteStudyArticle(initial.id);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("삭제됨", "success");
      router.push("/admin/study");
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <Field label="slug (영문/숫자/하이픈)">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="예: core-1"
            disabled={pending}
            data-testid="study-form-slug"
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
            <option value="core">필수 (core)</option>
            <option value="distortion">인지왜곡 (distortion)</option>
            <option value="body">불안과 몸 (body)</option>
            <option value="avoidance">회피와 행동 (avoidance)</option>
            <option value="rumination">반추 (rumination)</option>
          </select>
        </Field>
      </div>

      <Field label="제목">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={pending}
          data-testid="study-form-title"
          className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
        />
      </Field>

      <Field label="부제 (sub)">
        <input
          value={sub}
          onChange={(e) => setSub(e.target.value)}
          disabled={pending}
          data-testid="study-form-sub"
          className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
        />
      </Field>

      <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
        <Field label="순서 (order_index)">
          <input
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(Number(e.target.value))}
            disabled={pending}
            className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
          />
        </Field>
        <Field label="Cloudflare Stream UID (선택)">
          <input
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            disabled={pending}
            placeholder="예: 5d5bc37ffcf54c9b9e0d5b9b75fcf7c8"
            className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm font-mono"
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

      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gs-muted">본문 (HTML)</label>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="text-xs text-gs-blue hover:underline"
        >
          {preview ? "편집" : "미리보기"}
        </button>
      </div>
      {preview ? (
        <div
          className="study-body p-4 bg-white rounded-[12px] border border-gs-line-soft min-h-[300px]"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : (
        <textarea
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          disabled={pending}
          rows={24}
          data-testid="study-form-body"
          className="w-full px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm font-mono"
          placeholder="<p>본문 HTML</p>"
        />
      )}

      <p className="text-xs text-gs-muted">
        본문은 HTML 그대로 저장됩니다. 이미지는{" "}
        <code>/study-images/...</code> 정적 경로 그대로 사용 가능합니다.
      </p>

      <div className="flex items-center justify-between pt-4">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            data-testid="study-form-delete"
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
          data-testid="study-form-submit"
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
