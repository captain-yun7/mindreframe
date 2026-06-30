"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Field, Input, Select } from "../../_ui/field";
import { ConfirmDialog } from "../../_ui/confirm-dialog";
import {
  adminUpdateCoupon,
  adminDeleteCoupon,
  type AdminUpdateCouponInput,
} from "@/lib/actions/admin-coupons";

interface CouponData {
  code: string;
  description: string | null;
  plan: string;
  duration_days: number;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  is_active: boolean;
}

function toDateInput(v: string | null): string {
  if (!v) return "";
  return v.slice(0, 10);
}

export function CouponEditForm({ coupon }: { coupon: CouponData }) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [description, setDescription] = useState(coupon.description ?? "");
  const [plan, setPlan] = useState(coupon.plan);
  const [durationDays, setDurationDays] = useState(String(coupon.duration_days));
  const [validFrom, setValidFrom] = useState(toDateInput(coupon.valid_from));
  const [validUntil, setValidUntil] = useState(toDateInput(coupon.valid_until));
  const [maxUses, setMaxUses] = useState(coupon.max_uses != null ? String(coupon.max_uses) : "");
  const [isActive, setIsActive] = useState(coupon.is_active);

  const handleSave = async () => {
    setSaving(true);
    const input: AdminUpdateCouponInput = {
      description: description.trim() || null,
      plan: plan as "light" | "pro" | "premium",
      durationDays: Number(durationDays),
      validFrom: validFrom || null,
      validUntil: validUntil || null,
      maxUses: maxUses ? Number(maxUses) : null,
      isActive,
    };
    const res = await adminUpdateCoupon(coupon.code, input);
    setSaving(false);
    if (res.ok) {
      toast.show("쿠폰을 저장했어요", "success");
      router.refresh();
    } else {
      toast.show(res.error, "error");
    }
  };

  const handleDelete = async () => {
    const res = await adminDeleteCoupon(coupon.code);
    if (res.ok) {
      toast.show("쿠폰을 삭제했어요", "success");
      router.push("/admin/coupons");
    } else {
      toast.show(res.error, "error");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="설명">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="내부 메모" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="플랜">
          <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="light">라이트</option>
            <option value="pro">프로</option>
            <option value="premium">프리미엄</option>
          </Select>
        </Field>
        <Field label="기간(일)">
          <Input type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} min={1} max={365} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="유효 시작" hint="비우면 제한 없음">
          <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
        </Field>
        <Field label="유효 종료" hint="비우면 제한 없음">
          <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </Field>
      </div>
      <Field label="최대 사용 횟수" hint="비우면 무제한">
        <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} min={1} placeholder="무제한" />
      </Field>
      <label className="flex items-center gap-2 text-sm font-bold text-gs-text-strong">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-gs-blue" />
        활성 상태
      </label>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gs-line-soft">
        <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
          쿠폰 삭제
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "저장 중…" : "저장"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="쿠폰을 삭제할까요?"
        description={`${coupon.code} 쿠폰을 영구 삭제합니다. 사용 이력이 있으면 삭제 대신 비활성화하세요.`}
        confirmLabel="삭제"
        tone="danger"
      />
    </div>
  );
}
