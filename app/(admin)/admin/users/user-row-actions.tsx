"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { adminDeleteUser, adminHardDeleteUser } from "@/lib/actions/admin-users";

type Mode = "soft" | "hard";

/**
 * 목록 행 삭제 액션. 소프트(기본) / 하드(영구, 닉네임 재입력 확인).
 * 관리자 대상은 서버·UI 양쪽에서 차단.
 */
export function UserRowActions({
  userId,
  nickname,
  role,
}: {
  userId: string;
  nickname: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("soft");
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  if (role === "admin") {
    return <span className="text-[10px] text-gs-muted">관리자</span>;
  }

  const close = () => {
    setOpen(false);
    setMode("soft");
    setConfirmText("");
  };

  const handleDelete = () => {
    startTransition(async () => {
      const r =
        mode === "hard"
          ? await adminHardDeleteUser(userId)
          : await adminDeleteUser(userId);
      if (r.ok) {
        toast.show(
          mode === "hard" ? "영구 삭제되었어요" : "사용자가 삭제되었어요",
          "success",
        );
        close();
        router.refresh();
      } else {
        toast.show(r.error, "error");
      }
    });
  };

  const hardConfirmed = mode === "soft" || confirmText === nickname;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2 py-1 rounded border border-gs-line-soft text-xs text-gs-danger hover:bg-gs-danger/5"
      >
        삭제
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[14px] p-6 max-w-sm w-full">
            <h2 className="font-black text-lg">
              <b>{nickname}</b> 삭제
            </h2>

            <div className="mt-3 space-y-2 text-sm">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="del-mode"
                  checked={mode === "soft"}
                  onChange={() => {
                    setMode("soft");
                    setConfirmText("");
                  }}
                  className="mt-1"
                />
                <span>
                  <b>소프트 삭제</b>
                  <span className="block text-xs text-gs-muted">
                    로그인 차단 + 이메일 익명화. 데이터는 보존돼요.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="del-mode"
                  checked={mode === "hard"}
                  onChange={() => setMode("hard")}
                  className="mt-1"
                />
                <span>
                  <b className="text-gs-danger">완전 삭제 (영구)</b>
                  <span className="block text-xs text-gs-muted">
                    계정과 모든 데이터를 영구 제거해요. 되돌릴 수 없어요.
                  </span>
                </span>
              </label>
            </div>

            {mode === "hard" && (
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`확인하려면 "${nickname}" 입력`}
                className="mt-3 w-full px-3 py-2 rounded border border-gs-line-soft text-sm"
                aria-label="삭제 확인 닉네임"
              />
            )}

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={close}
                disabled={pending}
                className="px-3 py-2 rounded border border-gs-line-soft text-xs"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={pending || !hardConfirmed}
                className="px-3 py-2 rounded bg-gs-danger text-white text-xs font-bold disabled:opacity-50"
              >
                {pending ? "삭제 중..." : mode === "hard" ? "영구 삭제" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
