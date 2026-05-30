import { SiteHeader } from "@/components/site-header";

/**
 * K7·F214 — 푸터는 메인페이지(/)에서만 노출.
 * 알고가기·로그인·요금제·이용약관 등 나머지 public 페이지는 푸터 없음.
 * 메인페이지 푸터는 app/(public)/page.tsx 안에 직접 마운트.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
