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

        {/* 햄버거 (모바일) — Framer Motion 3선 → X 변환 */}
        <button
          className="hidden max-lg:flex w-10 h-10 items-center justify-center bg-transparent border-none cursor-pointer relative"
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

        {/* 데스크탑 네비게이션 */}
        <nav className="flex items-center gap-1 text-[13px] max-lg:hidden">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative text-gs-text-strong font-medium px-3 py-2 rounded-lg tracking-[-0.04em] whitespace-nowrap
                  transition-colors duration-200
                  hover:text-gs-gold
                  ${active ? "text-gs-gold" : ""}
                `}
              >
                <span>{item.label}</span>
                <span
                  className={`pointer-events-none absolute left-3 right-3 -bottom-0.5 h-0.5 bg-gs-gold rounded-full origin-left transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                  aria-hidden
                />
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin"
              className={`
                text-gs-gold-700 font-bold px-3 py-2 rounded-lg tracking-[-0.04em] whitespace-nowrap
                transition-colors duration-200
                hover:bg-gs-gold-50
                ${pathname.startsWith("/admin") ? "bg-gs-gold-50" : ""}
              `}
            >
              관리자
            </Link>
          )}

          {isLoggedIn ? (
            <>
              <span className="font-bold text-gs-text-strong ml-2 whitespace-nowrap">
                {userName}
                <span className="font-normal text-gs-muted-soft ml-px">님</span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-2 border border-gs-danger-border bg-gs-danger-bg text-gs-danger px-3 py-2 rounded-full text-[13px] font-bold cursor-pointer hover:bg-gs-danger-border transition-colors duration-200 whitespace-nowrap"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="ml-2 border border-gs-line-mid bg-transparent px-3 py-2 rounded-full text-[13px] font-bold cursor-pointer hover:bg-gs-surface-mid transition-colors duration-200 whitespace-nowrap"
            >
              로그인
            </Link>
          )}
        </nav>
      </div>

      {/* 모바일 메뉴 — AnimatePresence fade-down + stagger */}
      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            ref={navRef}
            className="hidden max-lg:block absolute top-16 right-3 w-[220px] z-50"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.nav
              className="bg-white rounded-2xl shadow-toss-card-hover border border-gs-line-soft p-3 flex flex-col gap-0.5"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.03,
                    delayChildren: 0.05,
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
                      className={`block text-gs-text-strong font-medium px-3 py-2.5 rounded-lg tracking-[-0.04em] text-sm transition-colors duration-150 hover:bg-gs-navy-50 hover:text-gs-gold ${
                        active ? "bg-gs-navy-50 text-gs-gold" : ""
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
                    className={`block text-gs-gold-700 font-bold px-3 py-2.5 rounded-lg tracking-[-0.04em] text-sm hover:bg-gs-gold-50 transition-colors duration-150 ${
                      pathname.startsWith("/admin") ? "bg-gs-gold-50" : ""
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    관리자
                  </Link>
                </motion.div>
              ) : null}

              <motion.div
                className="mt-1.5 pt-2 border-t border-gs-line-soft"
                variants={{
                  hidden: { opacity: 0, x: -8 },
                  visible: { opacity: 1, x: 0 },
                }}
                transition={{ duration: 0.2 }}
              >
                {isLoggedIn ? (
                  <div className="flex flex-col gap-1.5 px-1">
                    <span className="font-bold text-gs-text-strong text-sm px-2">
                      {userName}
                      <span className="font-normal text-gs-muted-soft ml-px">님</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="border border-gs-danger-border bg-gs-danger-bg text-gs-danger px-3 py-2 rounded-lg text-[13px] font-bold cursor-pointer hover:bg-gs-danger-border transition-colors duration-150"
                    >
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="block border border-gs-line-mid bg-transparent px-3 py-2 rounded-lg text-[13px] font-bold text-center hover:bg-gs-surface-mid transition-colors duration-150"
                    onClick={() => setMenuOpen(false)}
                  >
                    로그인
                  </Link>
                )}
              </motion.div>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
