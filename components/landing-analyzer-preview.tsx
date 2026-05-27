"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { analyzeAnonymous } from "@/lib/actions/landing-analyzer";
import type { AnalysisResult } from "@/lib/cbt/prompts";

/**
 * H6/F122 — 랜딩 비로그인 분석기.
 * 비로그인 사용자가 1회 무료 분석 → 결과 카드 → 결제 유도(/pricing).
 *
 * 추적: localStorage[landing_analyzer_anon_id] + server에서 IP+UUID+content_hash 검증.
 */

const STORAGE_KEY = "landing_analyzer_anon_id";

function getOrCreateAnonymousId(): string {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached && /^[0-9a-f-]{36}$/i.test(cached)) return cached;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function LandingAnalyzerPreview() {
  const [anonId, setAnonId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [alreadyUsed, setAlreadyUsed] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setAnonId(getOrCreateAnonymousId());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit() {
    setError(null);
    if (!anonId) return;
    const t = text.trim();
    if (!t) {
      setError("생각이나 상황을 적어주세요");
      return;
    }
    setPending(true);
    const r = await analyzeAnonymous({ anonymousId: anonId, content: t });
    setPending(false);

    if (!r.ok) {
      setError(r.error ?? "분석에 실패했어요");
      return;
    }
    if (r.crisis) {
      setError(
        "지금 많이 힘드신 것 같아요. 자살예방상담전화 1393 (24시간), 정신건강위기상담전화 1577-0199로 연락해주세요.",
      );
      return;
    }
    if (r.alreadyUsed) {
      setAlreadyUsed(true);
    }
    if (r.result) {
      setResult(r.result);
    }
  }

  // 결과 카드 — 인지왜곡 선택 시 결제 유도
  if (result) {
    return (
      <div className="w-full">
        <div className="rounded-[18px] overflow-hidden border-2 border-gs-gold-border bg-[#fff5ec] p-1">
          <div className="bg-white rounded-[16px] p-5">
            <div className="text-[12px] font-bold text-gs-navy-bright mb-2">
              ✨ {alreadyUsed ? "이전 분석 결과" : "분석 결과"}
            </div>
            <div className="space-y-2 text-[13.5px] text-gs-text-strong leading-relaxed">
              <div>
                <span className="font-bold text-gs-navy">상황 · </span>
                {result.situation}
              </div>
              <div>
                <span className="font-bold text-gs-navy">자동사고 · </span>
                {result.automatic_thought}
              </div>
              <div>
                <span className="font-bold text-gs-navy">감정 · </span>
                {result.emotion?.name ?? "—"}{" "}
                {typeof result.emotion?.intensity === "number"
                  ? `(${result.emotion.intensity}점)`
                  : ""}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-[12px] font-bold text-gs-muted-soft mb-2">
                발견된 인지왜곡 — 클릭하면 합리적 대안사고를 알려드려요
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {result.distortions.map((d, i) => (
                  <Link
                    key={`${d.name}-${i}`}
                    href="/pricing"
                    className="text-left p-3 rounded-toss-card border-2 border-gs-gold-border bg-[#fffaf3] hover:bg-white hover:-translate-y-0.5 hover:shadow-toss-card-hover transition-all"
                  >
                    <div className="text-[13px] font-bold text-gs-navy">
                      #{d.name}
                    </div>
                    <div className="text-[11.5px] text-gs-muted leading-[1.5] mt-1">
                      {d.description}
                    </div>
                    <div className="mt-2 text-[11px] text-gs-gold-700 font-bold">
                      → 합리적 대안 보기
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 p-5 rounded-toss-card bg-gradient-to-br from-gs-navy to-gs-navy-bright text-white">
          <p className="text-[13.5px] leading-[1.6] mb-3 opacity-95">
            <b>여기서 끝이 아니에요.</b> 합리적 대안사고 만들기, 4단계 행동연습장, 코치 채팅까지 — 100일 프로그램으로 진짜 변화를 만들어요.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-5 py-2.5 rounded-full bg-gs-gold text-gs-navy text-sm font-bold hover:brightness-105 transition-all"
          >
            100일 프로그램 시작하기 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="rounded-[18px] overflow-hidden border-2 border-gs-gold-border bg-[#fff5ec] p-1">
        <div className="bg-white rounded-[16px] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gs-success" />
              <span className="text-[13px] font-bold">가짜생각 분석기</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#fffaf3] border border-gs-gold-border text-gs-navy">
                무료 1회 체험
              </span>
            </div>
            <span className="text-[11px] text-gs-muted">CBT 인지왜곡 분석</span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={pending}
            rows={4}
            placeholder='예) 회의에서 발표할 때 다들 나를 무시하는 것 같았어요. 감정: 불안 80점'
            className="w-full px-3 py-3 rounded-[12px] border border-gs-line-soft text-[13.5px] outline-none focus:border-gs-navy-bright focus:ring-2 focus:ring-gs-navy-bright/20 transition-colors resize-y"
          />

          {error ? (
            <div className="mt-2 text-[12px] text-gs-danger bg-gs-danger-bg border border-gs-danger-border rounded-[10px] px-3 py-2">
              {error}
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !anonId}
              className="flex-1 py-2.5 rounded-full bg-gs-navy text-white text-sm font-bold hover:bg-gs-navy-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? "분석 중..." : "분석해보기 (가입 없이 1회 무료)"}
            </button>
          </div>

          <p className="mt-2 text-[11px] text-gs-muted-soft text-center">
            * 무료 체험은 1회 분석까지. 합리적 대안 만들기·코치 채팅은 가입 후 이용 가능해요.
          </p>
        </div>
      </div>
    </div>
  );
}
