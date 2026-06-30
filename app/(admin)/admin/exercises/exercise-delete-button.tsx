"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "../_ui/confirm-dialog";
import { adminDeleteExercise } from "@/lib/actions/admin-exercises";

export function ExerciseDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const r = await adminDeleteExercise(id);
      if (!r.ok) {
        toast.show(r.error, "error");
        setOpen(false);
        return;
      }
      toast.show("삭제됨", "success");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="destructive"
        size="xs"
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        삭제
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="운동 삭제"
        description={`"${title}"을(를) 삭제할까요? 사용 이력이 있으면 삭제되지 않습니다.`}
        confirmLabel="삭제"
        tone="danger"
      />
    </>
  );
}
