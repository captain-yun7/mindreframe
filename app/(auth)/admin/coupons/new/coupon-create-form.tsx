"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { adminCreateCoupon } from "@/lib/actions/admin-coupons";

const PLANS = ["light", "pro", "premium"] as const;

function randomCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function CouponCreateForm() {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("pro");
  const [durationDays, setDurationDays] = useState(7);
  const [validUntil, setValidUntil] = useState("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await adminCreateCoupon({
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        plan,
        durationDays,
        validUntil: validUntil || null,
        maxUses: maxUses ? Number(maxUses) : null,
      });
      if (r.ok) {
        toast.show("쿠폰이 발행됐어요", "success");
        router.push("/admin/coupons");
      } else {
        toast.show(r.error, "error");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gs-muted">코드 (영문대문자/숫자/-_ 4~40자)</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WELCOME7"
            maxLength={40}
            required
            className="flex-1 px-3 py-2 rounded border border-gs-line-soft font-mono"
          />
          <button
            type="button"
            onClick={() => setCode(randomCode(8))}
            className="px-3 py-2 rounded border border-gs-line-soft text-xs font-bold"
          >
            랜덤 생성
          </button>
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gs-muted">설명 (어드민 메모)</span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="베타 테스터 7일"
          maxLength={200}
          className="px-3 py-2 rounded border border-gs-line-soft"
        />
      </label>

      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gs-muted">적용 플랜</span>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as (typeof PLANS)[number])}
            className="px-3 py-2 rounded border border-gs-line-soft"
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gs-muted">기간 (일)</span>
          <input
            type="number"
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            min={1}
            max={365}
            required
            className="px-3 py-2 rounded border border-gs-line-soft"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gs-muted">유효 종료일 (선택)</span>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="px-3 py-2 rounded border border-gs-line-soft"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gs-muted">최대 사용 횟수 (선택, 무제한=빈칸)</span>
          <input
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            min={1}
            placeholder="무제한"
            className="px-3 py-2 rounded border border-gs-line-soft"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="px-4 py-2 rounded-[10px] bg-gs-blue text-white text-sm font-bold disabled:opacity-50"
        >
          {pending ? "발행 중…" : "쿠폰 발행"}
        </button>
      </div>
    </form>
  );
}
