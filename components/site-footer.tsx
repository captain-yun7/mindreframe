import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * 토스 톤 푸터 — 3컬럼 구조.
 * - 회사 정보 (서비스명·설명·주소)
 * - 서비스 메뉴 링크
 * - 정책·고객지원
 */

const serviceLinks = [
  { href: "/", label: "홈" },
  { href: "/study", label: "알고가기" },
  { href: "/pricing", label: "요금제" },
  { href: "/meditation", label: "명상하기" },
];

const policyLinks = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
];

export async function SiteFooter() {
  const settings = await getSiteSettings();
  const serviceName = settings.service_name || "가짜생각";
  const companyName = settings.company_name || "";
  const contactEmail = settings.contact_email || "";
  const address = settings.footer_address?.trim();

  return (
    <footer className="bg-gs-navy text-white/70 text-[13px] mt-auto">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {/* 회사 정보 */}
          <div>
            <p className="font-extrabold text-white text-[17px] tracking-[-0.02em]">
              {serviceName}
            </p>
            <p className="mt-2 text-white/60 leading-relaxed">
              인지행동치료 기반 생각 훈련 프로그램
            </p>
            {companyName ? (
              <p className="mt-4 text-[12px] text-white/50">
                {companyName}
              </p>
            ) : null}
            {address ? (
              <p className="mt-1 text-[12px] text-white/50 leading-relaxed">
                {address}
              </p>
            ) : null}
            {contactEmail ? (
              <p className="mt-1 text-[12px] text-white/50">
                <a
                  href={`mailto:${contactEmail}`}
                  className="hover:text-white/80 transition-colors"
                >
                  {contactEmail}
                </a>
              </p>
            ) : null}
          </div>

          {/* 서비스 */}
          <div>
            <p className="font-bold text-white/90 text-[13px] tracking-[-0.02em]">
              서비스
            </p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 정책 */}
          <div>
            <p className="font-bold text-white/90 text-[13px] tracking-[-0.02em]">
              정책 안내
            </p>
            <ul className="mt-3 flex flex-col gap-2.5">
              {policyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 md:mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-white/40">
          <span>&copy; 2026 {serviceName}. All rights reserved.</span>
          <span>이미지: Storyset</span>
        </div>
      </div>
    </footer>
  );
}
