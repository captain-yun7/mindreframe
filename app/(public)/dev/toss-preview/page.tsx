/**
 * Sprint B Phase 1 — 토스 톤 컴포넌트 시각 검증용 임시 페이지.
 *
 * 경로: /dev/toss-preview
 * 목적: components/toss/* + components/motion/* 단독 렌더 확인.
 *       Phase 1 완료 후 Phase 2/3에서 페이지 적용 시 이 파일 삭제 또는 NODE_ENV=development 가드.
 *
 * 주의: 본 페이지는 임시. 프로덕션 노출 무방하나 다음 Phase에서 제거 권장.
 */
import Image from "next/image";
import { Hero } from "@/components/toss/hero";
import { Section } from "@/components/toss/section";
import { FeatureCard } from "@/components/toss/feature-card";
import { BigCTA } from "@/components/toss/big-cta";
import { StatNumber } from "@/components/toss/stat-number";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerList, StaggerItem } from "@/components/motion/stagger-list";

export default function TossPreviewPage() {
  return (
    <>
      {/* Hero — dark + split */}
      <Hero
        tone="dark"
        align="split"
        eyebrow="Sprint B Phase 1"
        title={
          <>
            토스 톤 컴포넌트 <br />
            미리보기 🌱
          </>
        }
        subtitle="components/toss/* 5종 + components/motion/* 3종이 정상 렌더되는지 확인하는 페이지예요."
        cta={{ label: "시작하기", href: "/signup" }}
        secondaryCta={{ label: "둘러보기", href: "/" }}
        illustration={
          <Image
            src="/illustrations/hero-mindfulness.svg"
            alt="마음챙김 일러스트"
            width={480}
            height={360}
            priority
          />
        }
      />

      {/* Section — navy-50 + StaggerList of FeatureCard */}
      <Section tone="navy-50">
        <FadeIn>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-gs-navy text-center">
            기능 카드 미리보기
          </h2>
          <p className="mt-4 text-center text-gs-muted-soft text-base md:text-lg">
            FeatureCard 3개 stagger 진입 확인
          </p>
        </FadeIn>
        <StaggerList stagger={0.12} className="mt-12 grid gap-6 md:grid-cols-3">
          <StaggerItem>
            <FeatureCard
              emoji="💭"
              title="가짜생각 분석기"
              description="당신의 생각을 살펴봐요. AI가 인지왜곡을 찾아줍니다."
              href="/chat"
            />
          </StaggerItem>
          <StaggerItem>
            <FeatureCard
              emoji="🌙"
              title="잠시 쉬어가요"
              description="하루 3분 명상으로 마음을 가라앉혀요."
              href="/meditation"
            />
          </StaggerItem>
          <StaggerItem>
            <FeatureCard
              emoji="✨"
              title="성장하고 있어요"
              description="기록은 거짓말하지 않아요. 차근차근 변화를 확인해요."
              href="/progress"
            />
          </StaggerItem>
        </StaggerList>
      </Section>

      {/* Section — white + StatNumber */}
      <Section tone="light">
        <FadeIn>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-gs-navy text-center">
            통계 미리보기
          </h2>
        </FadeIn>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <StatNumber value="1,250+" label="100일 함께한 사람" accent="navy" />
          <StatNumber value="3.2만" label="분석 완료 건수" accent="navy" />
          <StatNumber value="98%" label="만족도" accent="gold" />
        </div>
      </Section>

      {/* Section — dark + BigCTA */}
      <Section tone="dark">
        <div className="text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-white">
              오늘 시작해보세요
            </h2>
            <p className="mt-5 text-white/80 text-base md:text-lg">
              작은 한 걸음이 큰 변화로 이어져요
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <BigCTA href="/signup" variant="gold" size="xl">
                무료로 시작하기
              </BigCTA>
              <BigCTA href="/pricing" variant="ghost" size="xl">
                요금 보기
              </BigCTA>
            </div>
          </FadeIn>
        </div>
      </Section>
    </>
  );
}
