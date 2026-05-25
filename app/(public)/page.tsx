import Image from "next/image";
import Link from "next/link";
import { ReviewCard } from "@/components/review-card";
import { LandingAnalyzerPreview } from "@/components/landing-analyzer-preview";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerList, StaggerItem } from "@/components/motion/stagger-list";
import { Section } from "@/components/toss/section";
import { FeatureCard } from "@/components/toss/feature-card";
import { BigCTA } from "@/components/toss/big-cta";

const reviews = [
  {
    text: '"18년간 먹던 불안·우울증 약을 먹지 않게 됐어요!"',
    tag: "40대 직장인 · 사회불안",
    gender: "female" as const,
    gradientId: "gF1",
    gradientColors: ["#4f46e5", "#22c55e"] as [string, string],
    clothColor: "#c7d2fe",
    clothStroke: "#4f46e5",
  },
  {
    text: '"인지행동치료 받다가 어려워서 포기했는데, 이렇게 쉬운 거였다니 충격적이네요!"',
    tag: "30대 자영업자 · 우울/불안",
    gender: "female" as const,
    gradientId: "gF2",
    gradientColors: ["#f97316", "#ec4899"] as [string, string],
    clothColor: "#ffe4e6",
    clothStroke: "#ec4899",
  },
  {
    text: '"하라는 대로만 하면 끝. 엄마가 달라진 저를 보고 놀랐어요!!"',
    tag: "20대 직장인 · 우울/불안",
    gender: "male" as const,
    gradientId: "gM1",
    gradientColors: ["#06b6d4", "#3b82f6"] as [string, string],
    clothColor: "#dbeafe",
    clothStroke: "#3b82f6",
  },
];

const features = [
  {
    emoji: "💭",
    title: "가짜생각 분석기",
    description: "자동사고를 인지왜곡으로 분류하고 대안사고를 함께 찾아드려요.",
    href: "/chat",
  },
  {
    emoji: "🗑️",
    title: "생각쓰레기통",
    description: "지금 떠오르는 생각을 한 줄만 버리세요. 마음이 조금 가벼워져요.",
    href: "/trash",
  },
  {
    emoji: "🌙",
    title: "명상하기",
    description: "3분만 멈춰 호흡으로 돌아와요. 짧고 가볍게 매일.",
    href: "/meditation",
  },
  {
    emoji: "🎯",
    title: "행동연습장",
    description: "용기 한 걸음, 불안에 다가가는 한 걸음. 작은 실행을 기록해요.",
    href: "/exercise",
  },
  {
    emoji: "🤝",
    title: "코치 채팅",
    description: "막힐 때는 코치와 함께. 알림톡으로 답변을 받아볼 수 있어요.",
    href: "/coach",
  },
  {
    emoji: "🌱",
    title: "나의 성장방",
    description: "오늘의 기록이 쌓여 100일의 변화로. 한눈에 확인하세요.",
    href: "/progress",
  },
];

export default function LandingPage() {
  return (
    <PageFade>
      {/* ── HERO (강한 다크 그라데이션 유지 + 일러스트 split 추가) ── */}
      <section className="w-full px-4 py-24 md:py-32 text-white bg-[radial-gradient(circle_at_20%_0%,rgba(63,99,255,0.4)_0,transparent_50%),linear-gradient(135deg,var(--color-gs-navy)_0%,var(--color-gs-navy-mid)_40%,var(--color-gs-navy-bright)_100%)]">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <FadeIn delay={0} y={20}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl leading-[1.15] font-extrabold tracking-[-0.03em]">
                우울·불안은{" "}
                <em className="text-gs-gold not-italic">생각습관</em>
                이에요.
                <br />
                훈련으로만 바뀝니다 🌱
              </h1>
              <p className="mt-6 text-base md:text-lg text-white/85 leading-relaxed">
                반복되는 &lsquo;가짜생각&rsquo;을 하루 10분, 쉽고 짧게.
                <br />
                100일이면 분명히 달라져요.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <BigCTA href="/signup" variant="gold" size="xl">
                  지금 시작하기
                </BigCTA>
                <BigCTA href="/study" variant="ghost" size="xl">
                  먼저 알아보기
                </BigCTA>
              </div>
              <div className="mt-6 text-xs md:text-sm text-white/60">
                ▼ 아래로 스크롤해서 직접 체험해보세요
              </div>
            </FadeIn>

            <FadeIn delay={0.1} y={20} className="hidden lg:flex items-center justify-center">
              <Image
                src="/illustrations/hero-mindfulness.svg"
                alt=""
                width={480}
                height={480}
                priority
                className="w-full max-w-[480px] h-auto"
              />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Features 그리드 ── */}
      <Section tone="light">
        <FadeIn>
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-gs-text-strong">
              이런 도구들이 함께해요
            </h2>
            <p className="mt-4 text-base md:text-lg text-gs-muted-soft">
              하루 5~10분, 6가지 도구를 골고루 써보세요.
            </p>
          </div>
        </FadeIn>

        <StaggerList stagger={0.08} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <FeatureCard
                emoji={f.emoji}
                title={f.title}
                description={f.description}
                href={f.href}
              />
            </StaggerItem>
          ))}
        </StaggerList>
      </Section>

      {/* ── 토닥챗 소개 (체험) ── */}
      <Section tone="navy-50">
        <FadeIn>
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-gs-navy">
              지금 떠오른 생각, 한 번 적어볼까요?
            </h2>
            <p className="mt-4 text-base md:text-lg text-gs-muted-soft">
              가입 없이도 분석기를 체험해볼 수 있어요.
            </p>
          </div>
          <div className="bg-white rounded-toss-card px-6 py-7 shadow-toss-card max-w-[880px] mx-auto">
            <LandingAnalyzerPreview />
          </div>
        </FadeIn>
      </Section>

      {/* ── 후기 ── */}
      <Section tone="light">
        <FadeIn>
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-gs-text-strong">
              먼저 시작한 분들의 이야기
            </h2>
          </div>
        </FadeIn>
        <StaggerList stagger={0.12} className="flex flex-col gap-20 md:gap-28 items-center">
          {reviews.map((review, i) => (
            <StaggerItem key={i}>
              <ReviewCard {...review} />
            </StaggerItem>
          ))}
        </StaggerList>
      </Section>

      {/* ── Stats (다크 배경 + gs-gold 강조) ── */}
      <Section tone="dark">
        <FadeIn>
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white">
              혼자가 아니에요
            </h2>
            <p className="mt-4 text-base md:text-lg text-white/70">
              지금 이 순간에도 함께 훈련하고 있어요.
            </p>
          </div>
        </FadeIn>
        <StaggerList stagger={0.1} className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <StaggerItem>
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-extrabold tracking-[-0.04em] text-gs-gold">
                1,000+
              </div>
              <div className="mt-3 text-sm md:text-base font-medium text-white/70">
                함께한 사람들
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-extrabold tracking-[-0.04em] text-gs-gold">
                50,000+
              </div>
              <div className="mt-3 text-sm md:text-base font-medium text-white/70">
                분석된 생각
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-extrabold tracking-[-0.04em] text-gs-gold">
                100일
              </div>
              <div className="mt-3 text-sm md:text-base font-medium text-white/70">
                훈련 프로그램
              </div>
            </div>
          </StaggerItem>
        </StaggerList>
      </Section>

      {/* ── 알고가기 ── */}
      <Section tone="navy-50">
        <FadeIn>
          <div className="bg-white rounded-toss-card px-6 md:px-8 py-10 md:py-12 shadow-toss-card max-w-[720px] mx-auto text-center">
            <div className="text-sm font-bold tracking-[-0.01em] text-gs-navy-bright mb-3">
              알고가기 📚
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em] text-gs-text-strong">
              생각은 곧 &lsquo;나&rsquo;가 아니에요
            </h2>
            <p className="mt-4 text-base text-gs-muted-soft leading-relaxed">
              이 한 문장이 왜 중요한지, 100일 동안 무엇을 훈련하는지
              <br className="hidden md:block" />
              쉽고 직관적으로 알아보세요.
            </p>
            <div className="mt-8 flex justify-center">
              <BigCTA href="/study" variant="primary" size="lg">
                알고가기 페이지로
              </BigCTA>
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* ── 최종 CTA (다크 hero 톤) ── */}
      <section className="w-full px-4 py-20 md:py-28 text-white bg-[linear-gradient(135deg,var(--color-gs-navy)_0%,var(--color-gs-navy-mid)_100%)]">
        <div className="mx-auto w-full max-w-[880px] text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-[-0.03em] leading-[1.15]">
              오늘 시작해보세요 🌱
            </h2>
            <p className="mt-5 md:mt-6 text-base md:text-lg text-white/80 leading-relaxed">
              하루 10분, 100일이면 분명히 달라져요.
              <br />
              완벽보다 시작이 중요해요.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <BigCTA href="/signup" variant="gold" size="xl">
                무료로 시작하기
              </BigCTA>
              <Link
                href="/pricing"
                className="inline-flex items-center text-white/70 text-sm md:text-base underline-offset-4 hover:underline mt-2"
              >
                100일 프로그램 보러가기 →
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </PageFade>
  );
}
