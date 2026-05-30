"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CelebrationModal } from "@/components/celebration-modal";

/**
 * K4·F165·F166 — 알고가기 진행 시 응원 카드 모달.
 *
 * 사용:
 *   ```tsx
 *   <StudyProgressLink href="/study/core-2">다음 →</StudyProgressLink>
 *   ```
 * 클릭 시 응원 모달 노출 → CTA 클릭으로 href로 라우팅.
 *
 * 응원 멘트 8종 랜덤 (감사일기 저장 모달과 동일 패턴 / 폭죽 효과).
 */

const PRAISE_VARIANTS = [
  "축하합니다! 새 지식을 선택하셨어요 ✨",
  "훌륭합니다! 한 걸음 더 나아가셨어요 ✨",
  "대단합니다! 지식 레벨이 상승했어요 ✨",
  "멋집니다! 필수 지식을 습득 중이에요 ✨",
  "굉장해요! 새 지식이 쌓이고 있어요 ✨",
  "놀랍습니다! 알아가는 속도가 빨라요 ✨",
  "잘하고 있어요! 앞으로 한 페이지 더 ✨",
  "함께 가요! 지식의 한 걸음을 응원해요 ✨",
];

function pickRandom(): string {
  return PRAISE_VARIANTS[Math.floor(Math.random() * PRAISE_VARIANTS.length)];
}

interface Props {
  href: string;
  className?: string;
  children: React.ReactNode;
  /** 별도 응원 멘트 (없으면 랜덤) */
  message?: string;
  /** 다음 글 제목 — 모달 body에 노출 */
  nextTitle?: string;
}

export function StudyProgressLink({
  href,
  className,
  children,
  message,
  nextTitle,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [praise, setPraise] = useState<string>("");

  useEffect(() => {
    // CSR 시점에 랜덤 선정 — hydration mismatch 방지를 위해 effect에서 한 번만
    setPraise(message ?? pickRandom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </button>
      <CelebrationModal
        open={open}
        onOpenChange={setOpen}
        title={praise || (message ?? PRAISE_VARIANTS[0])}
        body={nextTitle ? `다음 글: ${nextTitle}` : undefined}
        ctaLabel="다음 글로 이동"
        onCta={() => router.push(href)}
        autoCloseMs={0}
      />
    </>
  );
}
