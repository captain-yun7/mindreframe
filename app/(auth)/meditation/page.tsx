import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { MeditationOnboardingModal } from "@/components/meditation-onboarding-modal";
import { MeditationPlayer, type Track } from "./meditation-player";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";
import { getSiteSettings } from "@/lib/site-settings";
import { QuickNav } from "@/components/quick-nav";

// 마이그레이션 미적용 시 fallback (기존 코드 박힘 12개)
const FALLBACK_TRACKS: Track[] = [
  {
    slug: "guide-male-3min",
    category: "person",
    title: "남자 가이드 (3분)",
    description: "눈을 감고 편하게 앉은 뒤, 3분 동안 이 목소리만 따라가 주세요.",
    durationSeconds: 180,
    audioUrl:
      "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/명상-가이드 남자.mp3",
    videoId: null,
  },
  {
    slug: "guide-female-3min",
    category: "person",
    title: "여자 가이드 (3분)",
    description: "눈을 감고 편하게 앉은 뒤, 3분 동안 이 목소리만 따라가 주세요.",
    durationSeconds: 180,
    audioUrl:
      "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/명상-가이드 여자.mp3",
    videoId: null,
  },
  {
    slug: "nature-rain",
    category: "nature",
    title: "🌧 빗소리",
    description: "자연의 소리를 들으며 호흡에만 집중해보세요.",
    durationSeconds: 300,
    audioUrl:
      "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Rain Heavy Loud.mp3",
    videoId: null,
  },
  {
    slug: "nature-bonfire",
    category: "nature",
    title: "🔥 모닥불소리",
    description: "자연의 소리를 들으며 호흡에만 집중해보세요.",
    durationSeconds: 300,
    audioUrl:
      "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Daytime Forest Bonfire.mp3",
    videoId: null,
  },
  {
    slug: "nature-wave",
    category: "nature",
    title: "🌊 파도소리",
    description: "자연의 소리를 들으며 호흡에만 집중해보세요.",
    durationSeconds: 300,
    audioUrl:
      "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Waves Crashing on Rock Beach.mp3",
    videoId: null,
  },
  {
    slug: "nature-forest",
    category: "nature",
    title: "🌲 숲속 바람",
    description: "자연의 소리를 들으며 호흡에만 집중해보세요.",
    durationSeconds: 300,
    audioUrl:
      "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Forest Wind Summer.mp3",
    videoId: null,
  },
  {
    slug: "nature-birds",
    category: "nature",
    title: "🕊 산새소리",
    description: "자연의 소리를 들으며 호흡에만 집중해보세요.",
    durationSeconds: 300,
    audioUrl:
      "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Spring Day Forest.mp3",
    videoId: null,
  },
  {
    slug: "music-piano",
    category: "music",
    title: "🎹 잔잔한 피아노",
    description: "눈을 감고 음악에만 귀를 기울여보세요.",
    durationSeconds: 300,
    audioUrl:
      "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Sea of Memory - Aakash Gandhi.mp3",
    videoId: null,
  },
  {
    slug: "music-harp",
    category: "music",
    title: "🎵 잔잔한 하프",
    description: "눈을 감고 음악에만 귀를 기울여보세요.",
    durationSeconds: 300,
    audioUrl:
      "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Wistful Harp - Andrew Huang.mp3",
    videoId: null,
  },
  {
    slug: "music-guitar",
    category: "music",
    title: "🎻 잔잔한 기타",
    description: "눈을 감고 음악에만 귀를 기울여보세요.",
    durationSeconds: 300,
    audioUrl:
      "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Song of Sadhana - Jesse Gallagher.mp3",
    videoId: null,
  },
  {
    slug: "music-bell",
    category: "music",
    title: "🔔 종 앰비언트",
    description: "눈을 감고 음악에만 귀를 기울여보세요.",
    durationSeconds: 300,
    audioUrl:
      "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/The House Glows (With Almost No Help) - Chris Zabriskie.mp3",
    videoId: null,
  },
  {
    slug: "music-ambient",
    category: "music",
    title: "🌌 앰비언스",
    description: "눈을 감고 음악에만 귀를 기울여보세요.",
    durationSeconds: 300,
    audioUrl:
      "https://pub-7a2a05ff3b1a485a84cfbec7256a16f9.r2.dev/audio/Wander - Emmit Fenn.mp3",
    videoId: null,
  },
];

interface MeditationRow {
  slug: string;
  category: string;
  title: string;
  description: string | null;
  duration_seconds: number;
  audio_url: string | null;
  video_id: string | null;
}

export const revalidate = 300;

export default async function MeditationPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meditations")
    .select(
      "slug, category, title, description, duration_seconds, audio_url, video_id, order_index",
    )
    .order("category", { ascending: true })
    .order("order_index", { ascending: true });

  let tracks: Track[];
  if (error || !data || data.length === 0) {
    tracks = FALLBACK_TRACKS;
  } else {
    tracks = (data as MeditationRow[]).map((r) => ({
      slug: r.slug,
      category: r.category,
      title: r.title,
      description: r.description,
      durationSeconds: r.duration_seconds,
      audioUrl: r.audio_url,
      videoId: r.video_id,
    }));
  }

  // F76 — 가입일 14일 이내 사용자에게 명상 온보딩 모달 노출
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let daysSinceJoin: number | null = null;
  if (user?.created_at) {
    const joinTime = new Date(user.created_at).getTime();
    if (!Number.isNaN(joinTime)) {
      const nowMs = new Date().getTime();
      const diffMs = nowMs - joinTime;
      daysSinceJoin = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  const settings = await getSiteSettings();
  const heroSubtitle = settings.meditation_hero_subtitle;
  const popupMeditationFocus = settings.popup_meditation_focus;

  return (
    <PageFade>
      {/* ── HERO ── */}
      <section className="bg-gs-navy-50 py-12 md:py-16">
        <div className="mx-auto w-full max-w-[1120px] px-4">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <FadeIn delay={0} y={16}>
              <div className="text-sm font-bold tracking-[-0.01em] text-gs-navy-bright mb-3">
                명상하기
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-gs-navy leading-[1.15]">
                잠시 쉬어가요 🌙
              </h1>
              <p className="mt-4 md:mt-5 text-base md:text-lg text-gs-muted-soft leading-relaxed whitespace-pre-line">
                {heroSubtitle ?? "하루 3분, 한 곳에 초점을 두면 마음이 차분해져요."}
              </p>
            </FadeIn>

            <FadeIn delay={0.1} y={16} className="hidden lg:flex items-center justify-center">
              <Image
                src="/illustrations/meditation-calm.svg"
                alt=""
                width={260}
                height={260}
                className="w-[220px] xl:w-[260px] h-auto"
              />
            </FadeIn>
          </div>
        </div>
      </section>

      <main className="max-w-[1120px] mx-auto px-4 pt-8 md:pt-10 pb-24">
        <FadeIn>
          <MeditationPlayer tracks={tracks} />
        </FadeIn>
        <MeditationOnboardingModal
          daysSinceJoin={daysSinceJoin}
          popupJson={popupMeditationFocus}
        />
        <QuickNav />
      </main>
    </PageFade>
  );
}
