"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * K4·F156·F172·F173 — 페이지 푸터 "이어서 해볼까요?" → "이동할 곳을 선택해주세요"
 *
 * 페이지 매핑 (페이지별 2개):
 *   /dashboard (오늘의 루틴) → [성장방, 코치]
 *   /progress  (성장방)      → [오늘의 루틴, 코치]
 *   그 외                    → [오늘의 루틴, 성장방]
 *
 * 명상하기는 모든 매핑에서 제외.
 */

interface QuickNavItem {
  href: string;
  label: string;
  icon: string;
}

const ROUTINE: QuickNavItem = { href: "/dashboard", label: "오늘의 루틴", icon: "📅" };
const PROGRESS: QuickNavItem = { href: "/progress", label: "나의 성장방", icon: "🌱" };
const COACH: QuickNavItem = { href: "/coach", label: "코치 채팅", icon: "💬" };

function itemsForPath(pathname: string): QuickNavItem[] {
  if (pathname.startsWith("/dashboard")) return [PROGRESS, COACH];
  if (pathname.startsWith("/progress")) return [ROUTINE, COACH];
  return [ROUTINE, PROGRESS];
}

export function QuickNav() {
  const pathname = usePathname() ?? "/";
  const items = itemsForPath(pathname).filter((i) => !pathname.startsWith(i.href));
  if (items.length === 0) return null;

  return (
    <section className="mt-12 mb-16">
      <div className="max-w-[720px] mx-auto px-4">
        <div className="rounded-toss-card bg-white border border-gs-line-soft shadow-toss-card p-5">
          <h3 className="text-sm font-bold text-gs-navy mb-3 tracking-[-0.02em]">
            이동할 곳을 선택해주세요
          </h3>
          <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-3 rounded-toss-button border border-gs-line-soft bg-white text-sm font-bold text-gs-text-strong hover:border-gs-navy-bright hover:-translate-y-0.5 hover:shadow-toss-card transition-all"
              >
                <span aria-hidden>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
