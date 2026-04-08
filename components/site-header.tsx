"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/study", label: "알고가기" },
  { href: "/dashboard", label: "오늘의 루틴", auth: true },
  { href: "/trash", label: "생각쓰레기통", auth: true },
  { href: "/chat", label: "가짜생각 분석기", auth: true },
  { href: "/exercise", label: "행동연습장", auth: true },
  { href: "/meditation", label: "명상하기", auth: true },
  { href: "/progress", label: "나의성장방", auth: true },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // TODO: NextAuth 세션으로 교체
  const isLoggedIn = false;
  const userName = "";

  return (
    <header className="sticky top-0 z-50 h-16 bg-white/95 backdrop-blur-[18px] border-b border-[#e5e7eb]">
      <div className="max-w-[1100px] mx-auto h-16 px-4 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="flex items-center h-16">
          <Image
            src="/logo.png"
            alt="가짜생각 로고"
            width={160}
            height={80}
            className="h-[80px] w-auto"
            priority
          />
        </Link>

        {/* 햄버거 (모바일) */}
        <button
          className="hidden max-[860px]:flex w-8 h-8 items-center justify-center flex-col gap-1 bg-transparent border-none cursor-pointer"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="메뉴"
          type="button"
        >
          <span className="block w-[18px] h-0.5 bg-[#111827] rounded-sm" />
          <span className="block w-[18px] h-0.5 bg-[#111827] rounded-sm" />
          <span className="block w-[18px] h-0.5 bg-[#111827] rounded-sm" />
        </button>

        {/* 네비게이션 */}
        <nav
          className={`
            flex items-center gap-2 text-[13px]
            max-[860px]:hidden
            ${
              menuOpen
                ? "max-[860px]:!flex max-[860px]:flex-col max-[860px]:absolute max-[860px]:top-16 max-[860px]:right-3 max-[860px]:w-[110px] max-[860px]:p-3.5 max-[860px]:bg-white max-[860px]:rounded-[14px] max-[860px]:shadow-[0_12px_32px_rgba(15,23,42,0.18)] max-[860px]:z-50"
                : ""
            }
          `}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                text-[#111827] font-medium px-2 py-1.5 rounded-lg tracking-[-0.04em] whitespace-nowrap
                hover:bg-[#eef2ff] hover:text-[#1d4ed8]
                ${pathname === item.href ? "bg-[#eef2ff] text-[#1d4ed8]" : ""}
              `}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          {isLoggedIn ? (
            <>
              <span className="font-bold text-[#111827] ml-1.5">
                {userName}
                <span className="font-normal text-[#6b7280] ml-px">님</span>
              </span>
              <button
                type="button"
                className="ml-1.5 border border-[#fecaca] bg-[#fee2e2] text-[#b91c1c] px-2.5 py-1.5 rounded-full text-[13px] font-bold cursor-pointer hover:bg-[#fecaca]"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="ml-1.5 border border-[#d1d5db] bg-transparent px-2.5 py-1.5 rounded-full text-[13px] font-bold cursor-pointer hover:bg-[#f3f4f6]"
            >
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
