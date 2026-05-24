import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings";

export async function SiteFooter() {
  const settings = await getSiteSettings();
  const serviceName = settings.service_name || "가짜생각";
  const address = settings.footer_address?.trim();

  return (
    <footer className="bg-gs-navy text-white/70 text-[13px] mt-auto">
      <div className="max-w-[1120px] mx-auto px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-white/90 text-[15px]">{serviceName}</p>
            <p className="mt-1">인지행동치료 기반 생각 훈련 프로그램</p>
            {address ? (
              <p className="mt-2 text-[11px] text-white/50">{address}</p>
            ) : null}
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
          &copy; 2026 {serviceName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
