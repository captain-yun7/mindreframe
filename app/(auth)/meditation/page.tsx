"use client";

import { useState, useRef } from "react";
import { PageLayout, PageTitle } from "@/components/page-layout";

type Category = "person" | "nature" | "music";

interface Track {
  name: string;
  meta: string;
  src: string;
  minutes: number;
}

const categories: { key: Category; label: string; emoji: string }[] = [
  { key: "person", label: "사람", emoji: "" },
  { key: "nature", label: "자연", emoji: "" },
  { key: "music", label: "음악", emoji: "" },
];

const tracks: Record<Category, Track[]> = {
  person: [
    { name: "남자 가이드 (3분)", meta: "guide_3min · voice=man", src: "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/명상-가이드 남자.mp3", minutes: 3 },
    { name: "여자 가이드 (3분)", meta: "guide_3min · voice=woman", src: "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/명상-가이드 여자.mp3", minutes: 3 },
  ],
  nature: [
    { name: "🌧 빗소리", meta: "rain_01", src: "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Rain Heavy Loud.mp3", minutes: 5 },
    { name: "🔥 모닥불소리", meta: "bonfire_01", src: "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Daytime Forest Bonfire.mp3", minutes: 5 },
    { name: "🌊 파도소리", meta: "wave_01", src: "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Waves Crashing on Rock Beach.mp3", minutes: 5 },
    { name: "🌲 숲속 바람", meta: "forest_01", src: "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Forest Wind Summer.mp3", minutes: 5 },
    { name: "🕊 산새소리", meta: "birds_01", src: "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Spring Day Forest.mp3", minutes: 5 },
  ],
  music: [
    { name: "🎹 잔잔한 피아노", meta: "piano_01", src: "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Sea of Memory - Aakash Gandhi.mp3", minutes: 5 },
    { name: "🎵 잔잔한 하프", meta: "harp_01", src: "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Wistful Harp - Andrew Huang.mp3", minutes: 5 },
    { name: "🎻 잔잔한 기타", meta: "guitar_01", src: "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Song of Sadhana - Jesse Gallagher.mp3", minutes: 5 },
    { name: "🔔 종 앰비언트", meta: "bell_01", src: "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/The House Glows (With Almost No Help) - Chris Zabriskie.mp3", minutes: 5 },
    { name: "🌌 앰비언스", meta: "ambient_01", src: "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Wander - Emmit Fenn.mp3", minutes: 5 },
  ],
};

const categoryDescriptions: Record<Category, { title: string; desc: string }> = {
  person: { title: "사람(가이드)", desc: "눈을 감고 편하게 앉은 뒤, 3분 동안 이 목소리만 따라가 주세요." },
  nature: { title: "자연", desc: "자연의 소리를 들으며 호흡에만 집중해보세요." },
  music: { title: "음악", desc: "눈을 감고 음악에만 귀를 기울여보세요." },
};

export default function MeditationPage() {
  const [activeTab, setActiveTab] = useState<Category>("person");
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  function handlePlay(track: Track) {
    if (playing === track.src) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = track.src;
      audioRef.current.play();
      setPlaying(track.src);
    }
  }

  const catInfo = categoryDescriptions[activeTab];

  return (
    <PageLayout>
      {/* 가이드 */}
      <div className="text-center mb-6">
        <PageTitle className="text-center">지금 어디에 초점을 맞추고 싶나요?</PageTitle>
        <div className="mt-4 text-[14px] text-[#374151] leading-[1.8] max-w-[600px] mx-auto">
          <p>① <b>원하는 것을 하나 선택해 보세요.</b></p>
          <p className="text-gs-muted text-[13px] mb-2">소리, 호흡, 설거지할 때 손에 닿는 물의 감각, 한가지 생각, 어떤 것이든 하나면 충분합니다.</p>
          <p>② <b>선택한 곳에 잠시 초점을 두어봅니다.</b></p>
          <p className="text-gs-muted text-[13px] mb-2">잘하려고 애쓰지 않아도 괜찮습니다.</p>
          <p>③ <b>중간에 초점이 흩어져도 괜찮습니다.</b></p>
          <p className="text-gs-muted text-[13px] mb-2">알아차렸다면, 다시 원하는 곳으로 돌아오면 됩니다.</p>
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
            className={`p-6 rounded-[18px] text-center cursor-pointer border-2 transition-all ${
              activeTab === cat.key
                ? "border-gs-gold-border bg-white shadow-gs-card"
                : "border-gs-line bg-white hover:border-gs-gold-border/50"
            }`}
          >
            <p className="text-[18px] font-[950]">{cat.label}</p>
            <p className="text-[13px] text-gs-muted mt-1">
              {cat.key === "person" && "가이드 음성으로 함께 명상하기"}
              {cat.key === "nature" && "비, 바람, 숲, 물소리와 함께 있기"}
              {cat.key === "music" && "잔잔한 음악을 들으며 쉬기"}
            </p>
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
                : "bg-white text-[#374151] border-gs-line hover:bg-[#f3f4f6]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 트랙 목록 */}
      <div className="bg-white rounded-[18px] p-4 shadow-gs-card border border-[#e5e7eb]">
        <h2 className="text-[16px] font-bold">{catInfo.title}</h2>
        <p className="text-[13px] text-gs-muted mb-3">{catInfo.desc}</p>

        <div className="space-y-2">
          {tracks[activeTab].map((track) => (
            <div
              key={track.src}
              className="flex items-center justify-between p-3 border border-[rgba(226,232,240,0.9)] rounded-[14px]"
            >
              <div>
                <div className="font-[950] text-[14px]">{track.name}</div>
                <div className="text-[12px] text-gs-muted">{track.meta}</div>
              </div>
              <button
                type="button"
                onClick={() => handlePlay(track)}
                className={`px-3 py-2 rounded-xl text-[13px] font-bold border ${
                  playing === track.src
                    ? "bg-[#fee2e2] border-[#fecaca] text-[#b91c1c]"
                    : "bg-gs-blue-light border-[rgba(37,99,235,0.25)] text-gs-blue"
                }`}
              >
                {playing === track.src ? "정지" : "재생"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 숨겨진 오디오 */}
      <audio
        ref={audioRef}
        onEnded={() => setPlaying(null)}
        className="hidden"
      />
    </PageLayout>
  );
}
