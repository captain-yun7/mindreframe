"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", data.user.id)
          .single();
        setIsAdmin(profile?.role === "admin");
      } else {
        setIsAdmin(false);
      }
    }
    load();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  // 라우트 변경 시 메뉴 자동 닫힘
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // 스크롤 시 헤더 그림자 — 토스 톤 sticky 표시
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

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
    <header
      className={`sticky top-0 z-50 h-16 bg-white/95 backdrop-blur-[18px] border-b transition-shadow duration-200 ${
        scrolled
          ? "border-gs-line-soft shadow-[0_2px_12px_rgba(15,23,42,0.06)]"
          : "border-gs-line-soft/60"
      }`}
    >
      <div className="max-w-[1180px] mx-auto h-16 px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* 좌측: 로고 + 데스크탑 메뉴 */}
        <div className="flex items-center gap-8 min-w-0">
          <Link href="/" className="flex items-center h-16 shrink-0">
            <Image
              src="/logo.png"
              alt="가짜생각 로고"
              width={160}
              height={80}
              className="h-[64px] w-auto"
              priority
            />
          </Link>

          {/* 데스크탑 네비게이션 — 토스 톤 미니멀 */}
          <nav className="flex items-center gap-1 text-[14px] max-lg:hidden">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-2 rounded-lg tracking-[-0.02em] whitespace-nowrap transition-colors duration-200 ${
                    active
                      ? "text-gs-navy-900 font-bold"
                      : "text-gs-muted font-medium hover:text-gs-navy-900"
                  }`}
                >
                  <span>{item.label}</span>
                  {active ? (
                    <motion.span
                      layoutId="nav-underline"
                      className="pointer-events-none absolute left-3 right-3 -bottom-px h-[2px] bg-gs-gold rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      aria-hidden
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 햄버거 (모바일) — Framer Motion 3선 → X 변환 */}
        <button
          className="hidden max-lg:flex w-10 h-10 items-center justify-center bg-transparent border-none cursor-pointer relative shrink-0"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="메뉴"
          aria-expanded={menuOpen}
          type="button"
        >
          <span className="relative block w-5 h-4">
            <motion.span
              className="absolute left-0 right-0 h-0.5 bg-gs-text-strong rounded-sm origin-center"
              style={{ top: 0 }}
              animate={menuOpen ? { y: 7, rotate: 45 } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.span
              className="absolute left-0 right-0 h-0.5 bg-gs-text-strong rounded-sm origin-center top-1/2 -translate-y-1/2"
              animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.15 }}
            />
            <motion.span
              className="absolute left-0 right-0 h-0.5 bg-gs-text-strong rounded-sm origin-center"
              style={{ bottom: 0 }}
              animate={menuOpen ? { y: -7, rotate: -45 } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        </button>

        {/* 우측: 관리자/사용자 영역 */}
        <div className="flex items-center gap-2 max-lg:hidden shrink-0">
          {isAdmin ? (
            <Link
              href="/admin"
              className={`text-[13px] font-bold tracking-[-0.02em] px-3 py-1.5 rounded-full transition-colors duration-200 ${
                pathname.startsWith("/admin")
                  ? "bg-gs-gold-50 text-gs-gold-700 border border-gs-gold/40"
                  : "text-gs-gold-700 border border-transparent hover:bg-gs-gold-50"
              }`}
            >
              관리자
            </Link>
          ) : null}

          {isLoggedIn ? (
            <>
              <span className="flex items-center gap-px text-[13px] tracking-[-0.02em] text-gs-text-strong px-2 py-1.5 whitespace-nowrap">
                <span className="font-bold">{userName}</span>
                <span className="text-gs-muted-soft">님</span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[13px] font-medium tracking-[-0.02em] text-gs-muted-soft px-3 py-1.5 rounded-full hover:bg-gs-surface-mid hover:text-gs-text-strong transition-colors duration-200 whitespace-nowrap"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-[13px] font-bold tracking-[-0.02em] bg-gs-navy-900 text-white px-4 py-2 rounded-full hover:bg-gs-navy-800 transition-colors duration-200 whitespace-nowrap"
            >
              로그인
            </Link>
          )}
        </div>
      </div>

      {/* 모바일 메뉴 — 토스 톤 풀폭 슬라이드 패널 */}
      <AnimatePresence>
        {menuOpen ? (
          <>
            {/* 배경 dim */}
            <motion.div
              className="hidden max-lg:block fixed inset-0 top-16 z-40 bg-gs-navy-900/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <motion.div
              ref={navRef}
              className="hidden max-lg:block fixed top-16 left-0 right-0 z-50 bg-white border-b border-gs-line-soft shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.nav
                className="max-w-[1180px] mx-auto px-4 py-4 flex flex-col gap-0.5"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.025,
                      delayChildren: 0.04,
                    },
                  },
                  hidden: {},
                }}
              >
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <motion.div
                      key={item.href}
                      variants={{
                        hidden: { opacity: 0, x: -8 },
                        visible: { opacity: 1, x: 0 },
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link
                        href={item.href}
                        className={`block px-3 py-3 rounded-xl tracking-[-0.02em] text-[15px] transition-colors duration-150 ${
                          active
                            ? "bg-gs-gold-50 text-gs-navy-900 font-bold"
                            : "text-gs-text-strong font-medium hover:bg-gs-surface-mid"
                        }`}
                        onClick={() => setMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}

                {isAdmin ? (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, x: -8 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link
                      href="/admin"
                      className={`block px-3 py-3 rounded-xl tracking-[-0.02em] text-[15px] font-bold transition-colors duration-150 ${
                        pathname.startsWith("/admin")
                          ? "bg-gs-gold-50 text-gs-gold-700"
                          : "text-gs-gold-700 hover:bg-gs-gold-50"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      관리자
                    </Link>
                  </motion.div>
                ) : null}

                <motion.div
                  className="mt-2 pt-3 border-t border-gs-line-soft"
                  variants={{
                    hidden: { opacity: 0, x: -8 },
                    visible: { opacity: 1, x: 0 },
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {isLoggedIn ? (
                    <div className="flex items-center justify-between px-3 gap-3">
                      <span className="text-[15px] tracking-[-0.02em] text-gs-text-strong">
                        <span className="font-bold">{userName}</span>
                        <span className="text-gs-muted-soft ml-px">님</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-[13px] font-medium tracking-[-0.02em] text-gs-muted-soft px-3 py-1.5 rounded-full hover:bg-gs-surface-mid hover:text-gs-text-strong transition-colors duration-150"
                      >
                        로그아웃
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      className="block bg-gs-navy-900 text-white px-4 py-3 rounded-xl text-[15px] font-bold tracking-[-0.02em] text-center hover:bg-gs-navy-800 transition-colors duration-150"
                      onClick={() => setMenuOpen(false)}
                    >
                      로그인
                    </Link>
                  )}
                </motion.div>
              </motion.nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
