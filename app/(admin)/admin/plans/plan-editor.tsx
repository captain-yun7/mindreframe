"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { adminUpdatePlan, type AdminPlanInput } from "@/lib/actions/admin-plans";
import { ConfirmDialog } from "../_ui/confirm-dialog";

interface Props {
  initial: {
    slug: "light" | "pro" | "premium";
    name: string;
    amount: number;
    duration_days: number;
    recommended: boolean;
    features: string[];
    guarantee_html: string | null;
    sort_order: number;
    is_active: boolean;
  };
}

export function PlanEditor({ initial }: Props) {
  const [name, setName] = useState(initial.name);
  const [amount, setAmount] = useState(initial.amount);
  const [durationDays, setDurationDays] = useState(initial.duration_days);
  const [recommended, setRecommended] = useState(initial.recommended);
  const [featuresText, setFeaturesText] = useState(initial.features.join("\n"));
  const [guaranteeHtml, setGuaranteeHtml] = useState(initial.guarantee_html ?? "");
  const [sortOrder, setSortOrder] = useState(initial.sort_order);
  const [isActive, setIsActive] = useState(initial.is_active);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();

  const amountChanged = amount !== initial.amount;

  const doSave = () => {
    const features = featuresText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const input: AdminPlanInput = {
      slug: initial.slug,
      name,
      amount,
      durationDays,
      recommended,
      features,
      guaranteeHtml: guaranteeHtml || null,
      sortOrder,
      isActive,
    };
    startTransition(async () => {
      const r = await adminUpdatePlan(input);
      toast.show(r.ok ? "플랜 저장 완료" : r.error, r.ok ? "success" : "error");
    });
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black uppercase">{initial.slug}</h3>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          활성
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gs-muted">플랜명</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="px-2 py-1 rounded border border-gs-line-soft"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gs-muted">금액 (원)</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={0}
            className="px-2 py-1 rounded border border-gs-line-soft"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gs-muted">기간 (일)</span>
          <input
            type="number"
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            min={1}
            max={3650}
            className="px-2 py-1 rounded border border-gs-line-soft"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gs-muted">정렬 순서</span>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="px-2 py-1 rounded border border-gs-line-soft"
          />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={recommended}
          onChange={(e) => setRecommended(e.target.checked)}
        />
        <span className="text-sm">⭐ 추천 플랜으로 표시</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gs-muted">
          기능 (한 줄당 하나, 최대 20줄)
        </span>
        <textarea
          value={featuresText}
          onChange={(e) => setFeaturesText(e.target.value)}
          rows={6}
          className="px-2 py-1 rounded border border-gs-line-soft font-mono text-xs"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gs-muted">보장 HTML (선택)</span>
        <textarea
          value={guaranteeHtml}
          onChange={(e) => setGuaranteeHtml(e.target.value)}
          rows={2}
          placeholder='<p>7일 환불 보장</p>'
          className="px-2 py-1 rounded border border-gs-line-soft font-mono text-xs"
        />
      </label>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
          className="px-4 py-2 rounded-[10px] bg-gs-blue text-white text-sm font-bold disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSave}
        title="플랜을 저장할까요?"
        tone={amountChanged ? "danger" : "default"}
        confirmLabel="저장"
        description={
          <div className="space-y-2">
            <p>
              이 플랜(<b className="uppercase">{initial.slug}</b>)은 <b>결제 페이지에 즉시 반영</b>됩니다.
            </p>
            {amountChanged && (
              <p className="text-gs-danger font-bold">
                ⚠️ 금액 변경: {initial.amount.toLocaleString()}원 → {amount.toLocaleString()}원
              </p>
            )}
          </div>
        }
      />
    </div>
  );
}
