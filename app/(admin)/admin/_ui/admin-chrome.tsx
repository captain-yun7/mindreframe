"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  CreditCard,
  Repeat,
  BookOpen,
  Film,
  Music,
  Dumbbell,
  Award,
  MessageCircle,
  Bell,
  MessageSquareText,
  Ticket,
  Tags,
  Sparkles,
  Settings,
  ClipboardList,
  Activity,
  ScrollText,
  Menu,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "개요",
    items: [
      { href: "/admin", label: "대시보드", icon: LayoutDashboard, exact: true },
      { href: "/admin/stats", label: "통계", icon: BarChart3 },
    ],
  },
  {
    label: "사용자·결제",
    items: [
      { href: "/admin/users", label: "사용자", icon: Users },
      { href: "/admin/subscriptions", label: "구독", icon: Repeat },
      { href: "/admin/payments", label: "결제", icon: CreditCard },
      { href: "/admin/coupons", label: "쿠폰", icon: Ticket },
      { href: "/admin/plans", label: "플랜·가격", icon: Tags },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { href: "/admin/study", label: "알고가기", icon: BookOpen },
      { href: "/admin/study/videos", label: "일일영상", icon: Film },
      { href: "/admin/meditations", label: "명상", icon: Music },
      { href: "/admin/exercises", label: "운동 카탈로그", icon: Dumbbell },
      { href: "/admin/badges", label: "뱃지", icon: Award },
    ],
  },
  {
    label: "운영",
    items: [
      { href: "/admin/coach", label: "코치 채팅", icon: MessageCircle },
      { href: "/admin/notifications", label: "알림 이력", icon: Bell },
      { href: "/admin/notifications/messages", label: "알림 메시지", icon: MessageSquareText },
      { href: "/admin/surveys", label: "설문 응답", icon: ClipboardList },
      { href: "/admin/ai-usage", label: "AI 사용량", icon: Activity },
    ],
  },
  {
    label: "설정·감사",
    items: [
      { href: "/admin/prompts", label: "분석기 프롬프트", icon: Sparkles },
      { href: "/admin/settings", label: "사이트 설정", icon: Settings },
      { href: "/admin/audit", label: "감사 로그", icon: ScrollText },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function AdminChrome({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const sidebar = (
    <nav className="flex flex-col gap-5 px-3 py-5">
      <Link
        href="/admin"
        className="flex items-center gap-2 px-2 mb-1"
        onClick={() => setMobileOpen(false)}
      >
        <span className="text-[17px] font-[950] tracking-[-0.04em] text-gs-navy-900">
          가짜생각
        </span>
        <span className="text-[10px] font-bold text-gs-blue bg-gs-blue-soft px-1.5 py-0.5 rounded-full">
          ADMIN
        </span>
      </Link>
      {NAV.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <div className="px-2 mb-1 text-[10.5px] font-bold uppercase tracking-wider text-gs-muted-light">
            {group.label}
          </div>
          {group.items.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-[13.5px] font-bold tracking-[-0.02em] transition-colors",
                  active
                    ? "bg-gs-blue-soft text-gs-blue-soft-fg"
                    : "text-gs-text-strong hover:bg-gs-surface-muted",
                )}
              >
                <Icon size={17} className={active ? "text-gs-blue" : "text-gs-muted"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-gs-surface-muted/40">
      {/* 데스크탑 사이드바 */}
      <aside className="hidden lg:block w-[244px] shrink-0 border-r border-gs-line-soft bg-white sticky top-0 h-screen overflow-y-auto">
        {sidebar}
      </aside>

      {/* 모바일 오프캔버스 */}
      {mobileOpen ? (
        <div className="lg:hidden fixed inset-0 z-[150]">
          <div
            className="absolute inset-0 bg-gs-navy-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[260px] bg-white overflow-y-auto shadow-gs-card-hover">
            {sidebar}
          </aside>
        </div>
      ) : null}

      {/* 메인 */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-[100] h-14 bg-white/95 backdrop-blur border-b border-gs-line-soft flex items-center justify-between px-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-[10px] hover:bg-gs-surface-muted"
              aria-label="메뉴 열기"
            >
              <Menu size={18} />
            </button>
            <Link
              href="/"
              className="text-[13px] text-gs-muted hover:text-gs-text-strong font-medium hidden sm:inline"
            >
              ← 서비스로
            </Link>
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col items-end min-w-0">
              <span className="text-[13px] font-bold text-gs-text-strong truncate max-w-[160px]">
                {userName}
              </span>
              <span className="text-[11px] text-gs-muted truncate max-w-[160px]">
                {userEmail}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-[13px] font-bold text-gs-muted hover:text-gs-danger px-2.5 py-1.5 rounded-[10px] hover:bg-gs-danger-bg transition-colors"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </header>
        <main className="flex-1 px-5 py-6 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
