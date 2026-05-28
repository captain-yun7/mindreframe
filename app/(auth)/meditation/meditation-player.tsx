"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/card";
import { logMeditation } from "@/lib/actions/meditation";
import { useToast } from "@/components/ui/toast";

export type Category = "person" | "nature" | "music";

export interface Track {
  slug: string;
  category: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  audioUrl: string | null;
  videoId: string | null;
}

const categories: { key: Category; label: string; desc: string }[] = [
  { key: "person", label: "사람", desc: "가이드 음성으로 함께 명상하기" },
  { key: "nature", label: "자연", desc: "비, 바람, 숲, 물소리와 함께 있기" },
  { key: "music", label: "음악", desc: "잔잔한 음악을 들으며 쉬기" },
];

const categoryDescriptions: Record<Category, { title: string; desc: string }> = {
  person: {
    title: "사람(가이드)",
    desc: "눈을 감고 편하게 앉은 뒤, 3분 동안 이 목소리만 따라가 주세요.",
  },
  nature: { title: "자연", desc: "자연의 소리를 들으며 호흡에만 집중해보세요." },
  music: { title: "음악", desc: "눈을 감고 음악에만 귀를 기울여보세요." },
};

export function MeditationPlayer({ tracks }: { tracks: Track[] }) {
  const [activeTab, setActiveTab] = useState<Category>("person");
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playStartRef = useRef<number | null>(null);
  // H4·F110: 트랙 목록 ref → 카테고리 선택 시 자동 스크롤 대상
  const trackListRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  function pickCategory(key: Category) {
    setActiveTab(key);
    // 다음 paint 이후 스크롤 (Card mount 후)
    window.setTimeout(() => {
      trackListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function recordCompletion(track: Track) {
    const elapsed = playStartRef.current
      // eslint-disable-next-line react-hooks/purity -- 이벤트 핸들러 안에서만 호출됨
      ? Math.round((Date.now() - playStartRef.current) / 1000)
      : track.durationSeconds;
    playStartRef.current = null;
    const r = await logMeditation({
      trackSlug: track.slug,
      trackTitle: track.title,
      duration: Math.min(elapsed, track.durationSeconds),
    });
    if (!r.ok) toast.show(r.error, "error");
    else toast.show("명상 기록이 저장되었습니다", "success");
  }

  function handlePlay(track: Track) {
    if (!track.audioUrl) {
      toast.show("이 트랙은 영상 명상으로 차후 지원 예정입니다", "default");
      return;
    }
    if (playing === track.audioUrl) {
      audioRef.current?.pause();
      setPlaying(null);
      void recordCompletion(track);
      return;
    }
    // F121 — 다른 트랙 재생 중이면 기존 트랙 먼저 로깅 후 새 트랙으로 전환
    if (playing) {
      const prev = tracks.find((t) => t.audioUrl === playing);
      audioRef.current?.pause();
      if (prev) void recordCompletion(prev);
    }
    if (audioRef.current) {
      audioRef.current.src = track.audioUrl;
      audioRef.current.play().catch(() => {});
      // eslint-disable-next-line react-hooks/purity -- 이벤트 핸들러 안에서만 호출됨
      playStartRef.current = Date.now();
      setPlaying(track.audioUrl);
    }
  }

  const activeTracks = tracks.filter((t) => t.category === activeTab);
  const catInfo = categoryDescriptions[activeTab];

  return (
    <>
      {/* F138: 중복 가이드 블록 제거 — 동일 내용 팝업(popup_meditation_intro)으로 노출 */}

      {/* 카테고리 큰 카드 (F110: 작은 탭 제거, 큰 카드 클릭 시 트랙 목록으로 자동 스크롤) */}
      <div className="grid grid-cols-3 gap-4 mb-6 max-sm:grid-cols-1">
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => pickCategory(cat.key)}
            className={`p-6 rounded-toss-card text-center cursor-pointer border-2 transition-all ${
              activeTab === cat.key
                ? "border-gs-gold-border bg-white shadow-toss-card-hover -translate-y-0.5"
                : "border-gs-line-soft bg-white hover:border-gs-gold-border/50 hover:-translate-y-0.5 hover:shadow-toss-card"
            }`}
          >
            <p className="text-lg font-extrabold tracking-[-0.02em]">{cat.label}</p>
            <p className="text-[13px] text-gs-muted mt-1">{cat.desc}</p>
          </button>
        ))}
      </div>

      {/* 트랙 목록 */}
      <Card ref={trackListRef} className="shadow-toss-card scroll-mt-24">
        <h2 className="text-base font-bold">{catInfo.title}</h2>
        <p className="text-[13px] text-gs-muted mb-4">{catInfo.desc}</p>

        <div className="space-y-2">
          {activeTracks.length === 0 ? (
            <p className="text-center text-gs-muted text-sm py-6">
              등록된 트랙이 없습니다.
            </p>
          ) : (
            activeTracks.map((track) => {
              const isVideoOnly = !track.audioUrl && !!track.videoId;
              return (
                <div
                  key={track.slug}
                  className="flex items-center justify-between p-3 border border-gs-line-soft rounded-toss-card hover:bg-gs-navy-50/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-extrabold tracking-[-0.01em] text-sm">{track.title}</div>
                    {track.description ? (
                      <div className="text-xs text-gs-muted truncate">
                        {track.description}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePlay(track)}
                    disabled={isVideoOnly}
                    className={`px-4 py-2 rounded-toss-button text-[13px] font-bold border shrink-0 transition-all ${
                      playing === track.audioUrl
                        ? "bg-gs-danger-bg border-gs-danger-border text-gs-danger"
                        : isVideoOnly
                          ? "bg-gs-surface-muted border-gs-line-soft text-gs-muted opacity-60 cursor-not-allowed"
                          : "bg-gs-navy-50 border-gs-navy-bright/25 text-gs-navy-bright hover:-translate-y-0.5 hover:shadow-toss-card"
                    }`}
                  >
                    {playing === track.audioUrl
                      ? "정지"
                      : isVideoOnly
                        ? "영상 (준비중)"
                        : "재생"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <audio
        ref={audioRef}
        onEnded={() => {
          const currentSrc = audioRef.current?.src;
          const track = tracks.find((t) => t.audioUrl === currentSrc);
          setPlaying(null);
          if (track) void recordCompletion(track);
        }}
        className="hidden"
      />
    </>
  );
}
