import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-gs-navy text-white/70 text-[13px] mt-auto">
      <div className="max-w-[1120px] mx-auto px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-white/90 text-[15px]">가짜생각</p>
            <p className="mt-1">
              AI 인지행동치료 기반 생각 훈련 프로그램
            </p>
          </div>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white/90">
              이용약관
            </Link>
            <Link href="/privacy" className="hover:text-white/90">
              개인정보처리방침
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 text-xs text-white/40">
          &copy; 2026 가짜생각. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
