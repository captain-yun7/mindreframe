"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useCoachUnreadForUser, useCoachUnreadForAdmin } from "@/lib/hooks/use-coach-unread";

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
        // 운영자 이메일 화이트리스트 — 세션 토큰·RLS 이슈와 무관하게 즉시 admin 인식
        const ADMIN_EMAILS = [
          "mindtheater00@gmail.com",
        ];
        if (data.user.email && ADMIN_EMAILS.includes(data.user.email)) {
          setIsAdmin(true);
          return;
        }
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

  // K7·F154 — 카톡식 안 읽음 배지
  const coachUnread = useCoachUnreadForUser(isLoggedIn ? user!.id : null);
  const adminUnread = useCoachUnreadForAdmin(isAdmin);

  return (
    <header
      className={`sticky top-0 z-50 h-20 bg-white/95 backdrop-blur-[18px] border-b transition-shadow duration-200 ${
        scrolled
          ? "border-gs-line-soft shadow-[0_2px_12px_rgba(15,23,42,0.06)]"
          : "border-gs-line-soft/60"
      }`}
    >
      <div className="max-w-[1180px] mx-auto h-20 px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* 좌측: 로고 + 데스크탑 메뉴 */}
        <div className="flex items-center gap-8 min-w-0">
          <Link href="/" className="flex items-center h-20 shrink-0">
            <Image
              src="/logo.png"
              alt="가짜생각 로고"
              width={200}
              height={100}
              className="h-[80px] w-auto"
              priority
            />
          </Link>

          {/* 데스크탑 네비게이션 — 토스 톤 미니멀 */}
          <nav className="flex items-center gap-1 text-[14px] max-lg:hidden">
            {navItems.map((item) => {
              const active = pathname === item.href;
              // K7·F154 — 코치 메뉴 옆 안 읽음 배지
              const badge =
                item.href === "/coach" && coachUnread > 0 ? coachUnread : 0;
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
                  <span className="inline-flex items-center gap-1.5">
                    <span>{item.label}</span>
                    {badge > 0 ? <UnreadBadge count={badge} /> : null}
                  </span>
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

        {/* 햄버거 (모바일) — K4·F215 메뉴 열려있을 때는 숨김. X 닫기 버튼은 메뉴 패널 내부 좌상단(다른 좌표)에 별도 노출. */}
        {!menuOpen ? (
          <button
            className="hidden max-lg:flex w-10 h-10 items-center justify-center bg-transparent border-none cursor-pointer relative shrink-0"
            onClick={() => setMenuOpen(true)}
            aria-label="메뉴 열기"
            aria-expanded={false}
            type="button"
          >
            <span className="relative block w-5 h-4">
              <span className="absolute left-0 right-0 h-0.5 bg-gs-text-strong rounded-sm top-0" />
              <span className="absolute left-0 right-0 h-0.5 bg-gs-text-strong rounded-sm top-1/2 -translate-y-1/2" />
              <span className="absolute left-0 right-0 h-0.5 bg-gs-text-strong rounded-sm bottom-0" />
            </span>
          </button>
        ) : (
          // 메뉴 열려 있을 때 햄버거 자리는 빈 placeholder (레이아웃 안정)
          <div className="hidden max-lg:block w-10 h-10 shrink-0" aria-hidden />
        )}

        {/* 우측: 관리자/사용자 영역 */}
        <div className="flex items-center gap-2 max-lg:hidden shrink-0">
          {isAdmin ? (
            <Link
              href="/admin"
              className={`inline-flex items-center gap-1.5 text-[13px] font-bold tracking-[-0.02em] px-3 py-1.5 rounded-full transition-colors duration-200 ${
                pathname.startsWith("/admin")
                  ? "bg-gs-gold-50 text-gs-gold-700 border border-gs-gold/40"
                  : "text-gs-gold-700 border border-transparent hover:bg-gs-gold-50"
              }`}
            >
              <span>관리자</span>
              {adminUnread > 0 ? <UnreadBadge count={adminUnread} /> : null}
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
              {/* K4·F215 — 메뉴 패널 우상단 별도 X 버튼 (햄버거와 다른 좌표) */}
              <div className="max-w-[1180px] mx-auto px-4 pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="메뉴 닫기"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-gs-text-strong hover:bg-gs-surface-mid transition-colors"
                >
                  <span className="text-xl leading-none">×</span>
                </button>
              </div>
              <motion.nav
                className="max-w-[1180px] mx-auto px-4 pb-4 flex flex-col gap-0.5"
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
                  const badge =
                    item.href === "/coach" && coachUnread > 0 ? coachUnread : 0;
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
                        className={`flex items-center justify-between px-3 py-3 rounded-xl tracking-[-0.02em] text-[15px] transition-colors duration-150 ${
                          active
                            ? "bg-gs-gold-50 text-gs-navy-900 font-bold"
                            : "text-gs-text-strong font-medium hover:bg-gs-surface-mid"
                        }`}
                        onClick={() => setMenuOpen(false)}
                      >
                        <span>{item.label}</span>
                        {badge > 0 ? <UnreadBadge count={badge} /> : null}
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
                      className={`flex items-center justify-between px-3 py-3 rounded-xl tracking-[-0.02em] text-[15px] font-bold transition-colors duration-150 ${
                        pathname.startsWith("/admin")
                          ? "bg-gs-gold-50 text-gs-gold-700"
                          : "text-gs-gold-700 hover:bg-gs-gold-50"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span>관리자</span>
                      {adminUnread > 0 ? <UnreadBadge count={adminUnread} /> : null}
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

/**
 * K7·F154 — 카톡식 안 읽음 배지. 빨간 동그라미 + 숫자(99+).
 */
function UnreadBadge({ count }: { count: number }) {
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      data-testid="coach-unread-badge"
      aria-label={`안 읽음 ${count}개`}
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold leading-none tabular-nums shadow-[0_1px_3px_rgba(239,68,68,0.4)]"
    >
      {label}
    </span>
  );
}
