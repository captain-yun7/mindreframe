"use client";

import { useRef, useState } from "react";
import { PageTitle } from "@/components/page-layout";
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
  const toast = useToast();

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
      {/* 가이드 */}
      <div className="text-center mb-6">
        <PageTitle className="text-center text-2xl md:text-3xl">
          지금 어디에 초점을 맞추고 싶나요?
        </PageTitle>
        <div className="mt-4 text-sm text-gs-text-soft leading-[1.8] max-w-[600px] mx-auto">
          <p>① <b>원하는 것을 하나 선택해 보세요.</b></p>
          <p className="text-gs-muted text-[13px] mb-2">
            소리, 호흡, 설거지할 때 손에 닿는 물의 감각, 한가지 생각, 어떤 것이든 하나면 충분합니다.
          </p>
          <p>② <b>선택한 곳에 잠시 초점을 두어봅니다.</b></p>
          <p className="text-gs-muted text-[13px] mb-2">잘하려고 애쓰지 않아도 괜찮습니다.</p>
          <p>③ <b>중간에 초점이 흩어져도 괜찮습니다.</b></p>
          <p className="text-gs-muted text-[13px] mb-2">
            알아차렸다면, 다시 원하는 곳으로 돌아오면 됩니다.
          </p>
          <p className="font-bold mt-2">최소 3분 이상 해봐요!</p>
        </div>
      </div>

      {/* 카테고리 큰 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-4 max-sm:grid-cols-1">
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveTab(cat.key)}
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

      {/* 탭 */}
      <div className="flex gap-2 mb-4">
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveTab(cat.key)}
            className={`px-4 py-2 rounded-full text-[13px] font-bold border ${
              activeTab === cat.key
                ? "bg-gs-navy-bright text-white border-gs-navy-bright"
                : "bg-white text-gs-text-soft border-gs-line-soft hover:bg-gs-surface-mid"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 트랙 목록 */}
      <Card className="shadow-toss-card">
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
