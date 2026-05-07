"use client";

import { useState } from "react";
import Link from "next/link";

const categories = [
  { key: "all", label: "전체" },
  { key: "essential", label: "필수" },
  { key: "concept", label: "개념" },
  { key: "thought", label: "사고" },
  { key: "fake", label: "가짜생각" },
  { key: "change", label: "변화" },
];

export interface StudyItem {
  slug: string;
  category: string;
  title: string;
  desc: string;
}

const labelByCategory: Record<string, string> = Object.fromEntries(
  categories.map((c) => [c.key, c.label]),
);

export function StudyList({ items }: { items: StudyItem[] }) {
  const [active, setActive] = useState<string>("all");

  const filtered = active === "all" ? items : items.filter((i) => i.category === active);

  return (
    <>
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((cat) => {
          const isActive = active === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActive(cat.key)}
              className={`px-4 py-2 rounded-full text-[13px] font-bold border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 ${
                isActive
                  ? "border-gs-blue bg-gs-blue text-white"
                  : "border-gs-line-soft bg-white text-gs-text-soft hover:bg-gs-surface-mid"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="text-center text-gs-muted text-sm py-12">
            해당 카테고리에 아직 콘텐츠가 없어요.
          </div>
        ) : (
          filtered.map((item) => (
            <Link
              key={item.slug}
              href={`/study/${item.slug}`}
              className="block bg-white rounded-[18px] p-5 shadow-gs-card border border-gs-line-soft hover:shadow-gs-card-hover transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40"
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0 px-2.5 py-1 rounded-full bg-gs-blue-soft text-gs-blue-soft-fg text-[11px] font-bold">
                  {labelByCategory[item.category] ?? "기타"}
                </span>
                <h3 className="text-base font-[950] tracking-[-0.02em]">{item.title}</h3>
              </div>
              <p className="mt-2 text-[13px] text-gs-muted">{item.desc}</p>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
