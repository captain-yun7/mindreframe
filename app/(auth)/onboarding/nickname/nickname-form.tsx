"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setNicknameOnce } from "@/lib/actions/profile";
import { useToast } from "@/components/ui/toast";

export function NicknameSetupForm({ suggested }: { suggested: string }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(suggested);
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.show("닉네임을 입력해주세요", "error");
      return;
    }
    if (trimmed.length > 30) {
      toast.show("닉네임은 30자 이내", "error");
      return;
    }

    startTransition(async () => {
      const r = await setNicknameOnce(trimmed);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show(`환영해요, ${trimmed}님!`, "success");
      router.push("/survey");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !pending) handleSubmit();
        }}
        placeholder="닉네임 (예: 새벽별)"
        disabled={pending}
        maxLength={30}
        data-testid="nickname-input"
        className="w-full py-4 px-4 rounded-[14px] border-2 border-white/30 bg-white/10 text-base text-white outline-none focus:border-gs-gold focus:ring-4 focus:ring-gs-gold/40 placeholder:text-white/50 disabled:opacity-60"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        data-testid="nickname-submit"
        className="py-4 rounded-full text-base font-bold bg-gs-gold text-gs-text-strong cursor-pointer shadow-[0_10px_30px_rgba(250,204,107,0.4)] hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gs-gold/50"
      >
        {pending ? "저장 중..." : "이 닉네임으로 시작하기"}
      </button>
      <p className="text-[12px] text-white/60 mt-2">한 번 저장하면 변경할 수 없습니다.</p>
    </div>
  );
}
