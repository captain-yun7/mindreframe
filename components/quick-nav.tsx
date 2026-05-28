"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface QuickNavItem {
  href: string;
  label: string;
  icon: string;
}

// F130: 본문 하단 카드 — 현재 페이지 제외 + 상위 3개 빠른 이동
// 우선순위: 오늘의 루틴 / 나의 성장방 / 코치 채팅 (상위 3개) → 그 외는 보조
const ALL_ITEMS: QuickNavItem[] = [
  { href: "/dashboard", label: "오늘의 루틴", icon: "📅" },
  { href: "/progress", label: "나의 성장방", icon: "🌱" },
  { href: "/coach", label: "코치 채팅", icon: "💬" },
  { href: "/meditation", label: "명상하기", icon: "🌙" },
  { href: "/trash", label: "생각쓰레기통", icon: "🗑" },
  { href: "/chat", label: "가짜생각 분석기", icon: "💭" },
  { href: "/exercise", label: "행동연습장", icon: "🎯" },
];

export function QuickNav() {
  const pathname = usePathname();
  const items = ALL_ITEMS.filter((i) => i.href !== pathname).slice(0, 3);
  if (items.length === 0) return null;

  return (
    <section className="mt-12 mb-16">
      <div className="max-w-[720px] mx-auto px-4">
        <div className="rounded-toss-card bg-white border border-gs-line-soft shadow-toss-card p-5">
          <h3 className="text-sm font-bold text-gs-navy mb-3 tracking-[-0.02em]">
            이어서 해볼까요?
          </h3>
          <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
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
