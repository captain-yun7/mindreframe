"use client";

import { useState } from "react";
import Link from "next/link";
import { getIntroVideoSignedUrl } from "@/lib/actions/study-videos";

/**
 * 필수영상 1, 2 — 라이트 이상 구독자만 시청.
 * - locked=true → 자물쇠 카드, 클릭 시 /pricing으로
 * - locked=false → 클릭하면 server action으로 R2 presigned URL 발급, 카드 안 인라인 재생
 *
 * URL(R2 객체 키)은 site_settings(intro_video_{slot}_url)에 저장된 값을 사용한다.
 * 비어있으면 "영상 준비 중" 표시.
 */
export function IntroVideoCard({
  slot,
  title,
  subtitle,
  locked,
}: {
  slot: 1 | 2;
  title: string;
  subtitle: string;
  locked: boolean;
}) {
  const [active, setActive] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (locked) {
    return (
      <Link
        href={`/pricing?required=light&from=/study`}
        data-testid={`intro-video-locked-${slot}`}
        className="block bg-white rounded-toss-card p-5 shadow-toss-card border border-gs-line-soft hover:-translate-y-1 hover:shadow-toss-card-hover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-extrabold tracking-[-0.02em] leading-snug text-gs-text-strong">
            {title}
          </h3>
          <span
            aria-label="라이트 이상 구독자 전용"
            className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gs-navy-50 text-gs-navy-bright shrink-0"
          >
            🔒 라이트+
          </span>
        </div>
        <p className="mt-2 text-[13px] text-gs-muted">{subtitle}</p>
        <p className="mt-3 text-[12px] font-bold text-gs-navy-bright">
          구독하고 보기 →
        </p>
      </Link>
    );
  }

  async function handleToggle() {
    if (active) {
      setActive(false);
      setUrl(null);
      setError(null);
      return;
    }
    setActive(true);
    setLoading(true);
    setError(null);
    setUrl(null);
    try {
      const res = await getIntroVideoSignedUrl(slot);
      if (res.ok) {
        setUrl(res.url);
      } else {
        setError(res.reason === "plan" ? "구독자만 시청할 수 있어요" : "영상을 찾을 수 없어요");
      }
    } catch {
      setError("영상 URL을 가져오지 못했어요");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-testid={`intro-video-card-${slot}`}
      className="bg-white rounded-toss-card p-5 shadow-toss-card border border-gs-line-soft"
    >
      <h3 className="text-base font-extrabold tracking-[-0.02em] leading-snug text-gs-text-strong">
        {title}
      </h3>
      <p className="mt-2 text-[13px] text-gs-muted">{subtitle}</p>

      {!active ? (
        <button
          type="button"
          onClick={handleToggle}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-gs-navy-bright hover:underline"
        >
          <span aria-hidden>▶</span> 영상 재생
        </button>
      ) : (
        <div className="mt-3">
          {loading ? (
            <div className="w-full aspect-video bg-gs-navy-50 rounded-[12px] flex items-center justify-center text-sm text-gs-muted">
              불러오는 중…
            </div>
          ) : error ? (
            <div className="w-full aspect-video bg-gs-navy-50 rounded-[12px] flex flex-col items-center justify-center text-sm text-gs-muted px-4 text-center">
              {error}
            </div>
          ) : url ? (
            <video
              src={url}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="w-full aspect-video bg-black rounded-[12px]"
            />
          ) : (
            <div className="w-full aspect-video bg-gs-navy-50 rounded-[12px] flex flex-col items-center justify-center text-sm text-gs-muted px-4 text-center">
              영상 준비 중이에요
            </div>
          )}
          <button
            type="button"
            onClick={handleToggle}
            className="mt-2 text-[12px] text-gs-muted hover:text-gs-navy-bright transition-colors"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
