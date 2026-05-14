"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { href: "/study", label: "알고가기" },
  { href: "/dashboard", label: "오늘의 루틴", auth: true },
  { href: "/trash", label: "생각쓰레기통", auth: true },
  { href: "/chat", label: "가짜생각 분석기", auth: true },
  { href: "/exercise", label: "행동연습장", auth: true },
  { href: "/meditation", label: "명상하기", auth: true },
  { href: "/coach", label: "코치 채팅", auth: true },
  { href: "/progress", label: "나의성장방", auth: true },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: subscription } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  // 라우트 변경 시 메뉴 자동 닫힘
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // 외부 클릭 시 메뉴 자동 닫힘
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isLoggedIn = !!user;
  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.nickname ||
    user?.email?.split("@")[0] ||
    "";

  return (
    <header className="sticky top-0 z-50 h-16 bg-white/95 backdrop-blur-[18px] border-b border-gs-line-soft">
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
          className="hidden max-lg:flex w-8 h-8 items-center justify-center flex-col gap-1 bg-transparent border-none cursor-pointer"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="메뉴"
          type="button"
        >
          <span className="block w-[18px] h-0.5 bg-gs-text-strong rounded-sm" />
          <span className="block w-[18px] h-0.5 bg-gs-text-strong rounded-sm" />
          <span className="block w-[18px] h-0.5 bg-gs-text-strong rounded-sm" />
        </button>

        {/* 네비게이션 */}
        <nav
          ref={navRef}
          className={`
            flex items-center gap-2 text-[13px]
            max-lg:hidden
            ${
              menuOpen
                ? "max-lg:!flex max-lg:flex-col max-lg:items-stretch max-lg:absolute max-lg:top-16 max-lg:right-3 max-lg:w-[180px] max-lg:p-4 max-lg:bg-white max-lg:rounded-[14px] max-lg:shadow-gs-dropdown max-lg:z-50"
                : ""
            }
          `}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                text-gs-text-strong font-medium px-3 py-2 rounded-lg tracking-[-0.04em] whitespace-nowrap text-center
                hover:bg-gs-blue-soft hover:text-gs-blue-hover
                ${pathname === item.href ? "bg-gs-blue-soft text-gs-blue-hover" : ""}
                max-lg:text-left
              `}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          {isLoggedIn ? (
            <>
              <span className="font-bold text-gs-text-strong ml-2 max-lg:ml-0 max-lg:mt-2 max-lg:px-3 whitespace-nowrap">
                {userName}
                <span className="font-normal text-gs-muted-soft ml-px">님</span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-2 border border-gs-danger-border bg-gs-danger-bg text-gs-danger px-3 py-2 rounded-full text-[13px] font-bold cursor-pointer hover:bg-gs-danger-border whitespace-nowrap max-lg:ml-0 max-lg:mt-1 max-lg:rounded-lg max-lg:text-center"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="ml-2 border border-gs-line-mid bg-transparent px-3 py-2 rounded-full text-[13px] font-bold cursor-pointer hover:bg-gs-surface-mid whitespace-nowrap max-lg:ml-0 max-lg:mt-1 max-lg:rounded-lg max-lg:text-center"
            >
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
