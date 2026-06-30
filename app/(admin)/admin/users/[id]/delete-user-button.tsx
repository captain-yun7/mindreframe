"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { adminDeleteUser } from "@/lib/actions/admin-users";

/**
 * F71 — 위험 액션. 닉네임 재입력 확인 모달 + 서버 5단 가드.
 */
export function DeleteUserButton({
  userId,
  nickname,
}: {
  userId: string;
  nickname: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      const r = await adminDeleteUser(userId);
      if (r.ok) {
        toast.show("사용자가 삭제되었어요", "success");
        router.push("/admin/users");
        router.refresh();
      } else {
        toast.show(r.error, "error");
        setOpen(false);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded bg-gs-danger text-white text-xs font-bold"
      >
        사용자 삭제
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[14px] p-6 max-w-sm w-full">
            <h2 className="font-black text-lg">정말 삭제할까요?</h2>
            <p className="text-sm text-gs-muted mt-2">
              <b>{nickname}</b> 계정이 소프트 삭제됩니다. 로그인은 차단되고
              데이터는 보존돼요. 확인을 위해 닉네임을 입력해주세요.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={nickname}
              className="mt-3 w-full px-3 py-2 rounded border border-gs-line-soft text-sm"
              aria-label="삭제 확인 닉네임"
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                }}
                disabled={pending}
                className="px-3 py-2 rounded border border-gs-line-soft text-xs"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={pending || confirmText !== nickname}
                className="px-3 py-2 rounded bg-gs-danger text-white text-xs font-bold disabled:opacity-50"
              >
                {pending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
