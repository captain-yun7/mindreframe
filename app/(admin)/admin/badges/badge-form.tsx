"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "../_ui/field";
import { ConfirmDialog } from "../_ui/confirm-dialog";
import {
  adminCreateBadge,
  adminUpdateBadge,
  adminDeleteBadge,
} from "@/lib/actions/admin-badges";

interface Props {
  mode: "create" | "edit";
  initial?: {
    id: string;
    key: string;
    title: string;
    description: string;
    icon: string;
    condition: string;
  };
}

export function BadgeForm({ mode, initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [key, setKey] = useState(initial?.key ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [condition, setCondition] = useState(initial?.condition ?? "{}");

  const handleSubmit = () => {
    const payload = {
      key: key.trim(),
      title: title.trim(),
      description: description.trim(),
      icon: icon.trim(),
      condition,
    };
    startTransition(async () => {
      const r =
        mode === "create"
          ? await adminCreateBadge(payload)
          : await adminUpdateBadge(initial!.id, payload);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("저장되었습니다", "success");
      router.push("/admin/badges");
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!initial) return;
    startTransition(async () => {
      const r = await adminDeleteBadge(initial.id);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("삭제되었습니다", "success");
      router.push("/admin/badges");
      router.refresh();
    });
  };

  return (
    <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <Field label="key (코드)" hint="영문 소문자/숫자/언더스코어/하이픈" required>
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="예: first_record"
            disabled={pending}
            className="font-mono"
          />
        </Field>
        <Field label="아이콘" hint="이모지 또는 짧은 문자" required>
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="예: 🏅"
            disabled={pending}
          />
        </Field>
      </div>

      <Field label="제목" required>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 첫 기록 완료"
          disabled={pending}
        />
      </Field>

      <Field label="설명" required>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="뱃지 획득 조건/의미 설명"
          disabled={pending}
        />
      </Field>

      <Field
        label="condition (JSON)"
        hint="획득 조건 메타데이터. 비워두면 {} 로 저장됩니다."
      >
        <Textarea
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          rows={8}
          placeholder='{ "type": "record_count", "count": 1 }'
          disabled={pending}
          className="font-mono text-xs"
        />
      </Field>

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
        tone="danger"
        title="뱃지 삭제"
        description={
          <>
            <b>{initial?.title}</b> 뱃지를 삭제합니다. 보유자가 있으면 삭제할 수
            없습니다.
          </>
        }
        confirmLabel="삭제"
      />
    </div>
  );
}
