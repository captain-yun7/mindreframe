"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select } from "../_ui/field";
import { ConfirmDialog } from "../_ui/confirm-dialog";
import {
  adminCreateExercise,
  adminUpdateExercise,
  adminDeleteExercise,
} from "@/lib/actions/admin-exercises";

interface Props {
  mode: "create" | "edit";
  categories?: string[];
  initial?: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: number;
    sortOrder: number;
  };
}

export function ExerciseForm({ mode, categories = [], initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [difficulty, setDifficulty] = useState<number>(initial?.difficulty ?? 1);
  const [sortOrder, setSortOrder] = useState<number>(initial?.sortOrder ?? 0);

  const handleSubmit = () => {
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      difficulty,
      sortOrder,
    };
    startTransition(async () => {
      const r =
        mode === "create"
          ? await adminCreateExercise(payload)
          : await adminUpdateExercise(initial!.id, payload);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("저장됨", "success");
      router.push("/admin/exercises");
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!initial) return;
    startTransition(async () => {
      const r = await adminDeleteExercise(initial.id);
      if (!r.ok) {
        toast.show(r.error, "error");
        setConfirmOpen(false);
        return;
      }
      toast.show("삭제됨", "success");
      router.push("/admin/exercises");
      router.refresh();
    });
  };

  return (
    <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card p-5 space-y-4">
      <Field label="제목" required>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 호흡 이완 훈련"
          disabled={pending}
        />
      </Field>

      <Field label="설명" required>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder="운동 방법 설명"
          disabled={pending}
        />
      </Field>

      <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
        <Field label="카테고리" required hint="새 값 입력 가능">
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="예: 호흡"
            list="exercise-categories"
            disabled={pending}
          />
          <datalist id="exercise-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <Field label="난이도 (1~5)">
          <Select
            value={String(difficulty)}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            disabled={pending}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)} ({n})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="정렬순서">
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            disabled={pending}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between pt-2">
        {mode === "edit" ? (
          <Button
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
          >
            삭제
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "저장 중…" : mode === "create" ? "등록" : "저장"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="운동 삭제"
        description={`"${initial?.title}"을(를) 삭제할까요? 사용 이력이 있으면 삭제되지 않습니다.`}
        confirmLabel="삭제"
        tone="danger"
      />
    </div>
  );
}
