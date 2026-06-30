"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Field, Input } from "../../_ui/field";
import { EmptyState } from "../../_ui/empty-state";
import { fmtDateTime } from "../../_ui/lib/fmt";
import { adminGrantBadge, adminRevokeBadge } from "@/lib/actions/admin-badges";

export interface Holder {
  userId: string;
  email: string | null;
  nickname: string | null;
  earnedAt: string | null;
}

export function GrantPanel({
  badgeId,
  holders,
}: {
  badgeId: string;
  holders: Holder[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");

  const handleGrant = () => {
    const target = email.trim();
    if (!target) {
      toast.show("이메일을 입력하세요", "error");
      return;
    }
    startTransition(async () => {
      const r = await adminGrantBadge(badgeId, target);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("부여되었습니다", "success");
      setEmail("");
      router.refresh();
    });
  };

  const handleRevoke = (userId: string) => {
    startTransition(async () => {
      const r = await adminRevokeBadge(badgeId, userId);
      if (!r.ok) {
        toast.show(r.error, "error");
        return;
      }
      toast.show("회수되었습니다", "success");
      router.refresh();
    });
  };

  return (
    <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card p-5 space-y-5">
      <div>
        <h2 className="m-0 text-[15px] font-[950] tracking-[-0.03em] text-gs-navy-900">
          수동 부여
        </h2>
        <p className="mt-1 text-xs text-gs-muted">
          이메일로 유저를 찾아 이 뱃지를 부여합니다.
        </p>
      </div>

      <div className="flex items-end gap-2 max-sm:flex-col max-sm:items-stretch">
        <Field label="유저 이메일" className="flex-1">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            disabled={pending}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGrant();
            }}
          />
        </Field>
        <Button onClick={handleGrant} disabled={pending}>
          {pending ? "처리 중…" : "부여"}
        </Button>
      </div>

      <div>
        <div className="text-[13px] font-bold text-gs-text-strong mb-2">
          보유자 ({holders.length}명)
        </div>
        {holders.length === 0 ? (
          <EmptyState title="아직 보유자가 없습니다" />
        ) : (
          <ul className="divide-y divide-gs-line-soft border border-gs-line-soft rounded-[12px] overflow-hidden">
            {holders.map((h) => (
              <li
                key={h.userId}
                className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-gs-surface-muted/40"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gs-navy-900 truncate">
                    {h.nickname || h.email || h.userId}
                  </div>
                  <div className="text-xs text-gs-muted truncate">
                    {h.email ?? "-"} · {fmtDateTime(h.earnedAt)}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleRevoke(h.userId)}
                  disabled={pending}
                >
                  회수
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
