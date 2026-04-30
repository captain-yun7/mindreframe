"use client";

import { useState, useTransition } from "react";
import { updateNickname } from "@/lib/actions/profile";
import { useToast } from "@/components/ui/toast";

export function NicknameForm({ initial }: { initial: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-gs-muted">닉네임</span>
        <div className="flex items-center gap-2">
          <span data-testid="profile-nickname" className="text-sm font-bold">
            {initial}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-gs-blue underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 rounded"
          >
            변경
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] text-gs-muted shrink-0">닉네임</span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 px-2 py-1 border border-gs-line-soft rounded-lg text-sm outline-none focus:border-gs-blue focus:ring-2 focus:ring-gs-blue/20"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await updateNickname(value);
            if (!r.ok) {
              toast.show(r.error, "error");
              return;
            }
            toast.show("닉네임이 변경되었습니다", "success");
            setEditing(false);
          })
        }
        className="text-xs text-white bg-gs-navy-bright rounded-md px-2 py-1 disabled:opacity-50"
      >
        저장
      </button>
      <button
        type="button"
        onClick={() => {
          setValue(initial);
          setEditing(false);
        }}
        className="text-xs text-gs-muted"
      >
        취소
      </button>
    </div>
  );
}
