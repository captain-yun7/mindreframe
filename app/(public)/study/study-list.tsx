"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { StudyGroup, StudyItem } from "@/lib/study-content";

export function StudyList({
  core,
  groups,
}: {
  core: StudyItem[];
  groups: StudyGroup[];
}) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();

  const filteredCore = useMemo(
    () => (term ? core.filter((i) => match(i, term)) : core),
    [core, term],
  );

  const filteredGroups = useMemo(
    () =>
      groups.map((g) => ({
        ...g,
        items: term ? g.items.filter((i) => match(i, term)) : g.items,
      })),
    [groups, term],
  );

  const totalHits = term
    ? filteredCore.length + filteredGroups.reduce((s, g) => s + g.items.length, 0)
    : null;

  return (
    <>
      <div className="mb-6">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="검색 (예: 초점, 불안, 왜곡, 회피, 완벽주의)"
          className="w-full px-4 py-3 rounded-full border border-gs-line-soft bg-white text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40"
          aria-label="알고가기 검색"
        />
        {term && (
          <p className="mt-2 text-xs text-gs-muted">
            검색 결과 {totalHits}개
          </p>
        )}
      </div>

      <section className="mb-10">
        <header className="mb-4">
          <h2 className="text-xl font-[950] tracking-[-0.02em]">필수</h2>
          <p className="text-[13px] text-gs-muted mt-1">먼저 이것만 보면 됩니다</p>
        </header>
        {filteredCore.length === 0 ? (
          <div className="text-center text-gs-muted text-sm py-8 border border-dashed border-gs-line-soft rounded-[14px]">
            검색 결과가 없어요.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredCore.map((item) => (
              <StudyCard key={item.slug} item={item} />
            ))}
          </div>
        )}
      </section>

      <section>
        <header className="mb-4">
          <h2 className="text-xl font-[950] tracking-[-0.02em]">더 많이 알고가기</h2>
        </header>
        <div className="space-y-3">
          {filteredGroups.map((g) => (
            <details
              key={g.key}
              className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card open:shadow-gs-card-hover"
              open={term ? g.items.length > 0 : false}
            >
              <summary className="cursor-pointer px-5 py-4 flex items-center justify-between font-bold text-[15px] [&::-webkit-details-marker]:hidden">
                <span>
                  {g.title}
                  <span className="ml-2 text-xs text-gs-muted font-medium">
                    {g.items.length}개
                  </span>
                </span>
                <span aria-hidden className="text-gs-muted">▾</span>
              </summary>
              <div className="px-3 pb-3">
                {g.items.length === 0 ? (
                  <p className="text-center text-xs text-gs-muted py-4">
                    검색 결과가 없어요.
                  </p>
                ) : (
                  <ul className="grid gap-2">
                    {g.items.map((item) => (
                      <li key={item.slug}>
                        <StudyMini item={item} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

function match(it: StudyItem, term: string) {
  return (it.title + " " + it.sub).toLowerCase().includes(term);
}

function StudyCard({ item }: { item: StudyItem }) {
  return (
    <Link
      href={`/study/${item.slug}`}
      className="block bg-white rounded-[18px] p-5 shadow-gs-card border border-gs-line-soft hover:shadow-gs-card-hover transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40"
    >
      <h3 className="text-[15px] font-[950] tracking-[-0.02em] leading-snug">
        {item.title}
      </h3>
      <p className="mt-2 text-[13px] text-gs-muted">{item.sub}</p>
    </Link>
  );
}

function StudyMini({ item }: { item: StudyItem }) {
  return (
    <Link
      href={`/study/${item.slug}`}
      className="block rounded-[12px] px-4 py-3 bg-gs-surface-mid hover:bg-gs-surface-muted border border-transparent hover:border-gs-line-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40"
    >
      <h4 className="text-[14px] font-bold leading-snug">{item.title}</h4>
      <p className="mt-1 text-[12px] text-gs-muted">{item.sub}</p>
    </Link>
  );
}
