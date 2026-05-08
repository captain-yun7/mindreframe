import Link from "next/link";
import { ReviewCard } from "@/components/review-card";
import { LandingAnalyzerPreview } from "@/components/landing-analyzer-preview";

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

export default function LandingPage() {
  return (
    <div className="bg-gs-bg">
      {/* ── HERO ── */}
      <section className="w-full min-h-[85vh] px-4 py-32 max-sm:py-24 flex justify-center items-center text-center text-white bg-[radial-gradient(circle_at_20%_0%,rgba(63,99,255,0.4)_0,transparent_50%),linear-gradient(135deg,var(--color-gs-navy)_0%,var(--color-gs-navy-mid)_40%,var(--color-gs-navy-bright)_100%)]">
        <div className="max-w-[880px]">
          <h1 className="text-5xl max-sm:text-4xl leading-[1.6] font-extrabold mb-6 tracking-[-0.03em]">
            우울·불안은 <em className="text-gs-gold not-italic">생각습관</em>
            이에요.
            <br />
            훈련으로만 바뀝니다.
            <br />
            어렵다고요?
          </h1>
          <p className="text-lg max-sm:text-base text-[#e5e7ff] mb-3 leading-[1.7]">
            당신의 머릿속에서 반복되는 &lsquo;가짜생각(자동사고)&rsquo;을
            <br />
            하루 10분, 쉽고 짧게 바꾸는 훈련.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block px-7 py-3.5 rounded-full border border-gs-gold bg-transparent text-lg font-bold text-gs-gold shadow-[0_0_16px_rgba(250,204,107,0.7)] hover:shadow-[0_0_22px_rgba(250,204,107,0.95)] hover:brightness-[1.07] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gs-gold/40"
          >
            가짜생각바꾸기 바로 시작하기
          </Link>
          <div className="mt-6 text-[13px] text-gs-line-mid animate-bounce">
            ▼ 아래로 스크롤해서 지금 떠오르는 생각을 적어보세요
          </div>
        </div>
      </section>

      {/* ── 토닥챗 소개 ── */}
      <section className="pt-10 px-4">
        <div className="bg-white rounded-[20px] px-6 py-7 shadow-gs-card-hover max-w-[880px] mx-auto">
          <h2 className="text-xl font-extrabold mb-2">
            가짜생각바꾸기 대화 시작하기
          </h2>
          <p className="text-center text-sm text-gs-muted-soft mb-4 leading-[1.7]">
            기적의 100일, 프로그램 따라만 오세요!
          </p>
          <LandingAnalyzerPreview />
        </div>
      </section>

      {/* ── 후기 ── */}
      <section className="pt-10 px-4">
        <div className="max-w-[880px] mx-auto pt-10">
          <div className="flex flex-col gap-40 items-center">
            {reviews.map((review, i) => (
              <ReviewCard key={i} {...review} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 알고가기 ── */}
      <section className="py-10 px-4">
        <div className="bg-white rounded-[20px] px-6 py-7 shadow-gs-card-hover max-w-[880px] mx-auto text-center">
          <h2 className="text-xl font-extrabold mb-2">알고가기</h2>
          <p className="text-xl font-bold text-center mb-2">
            생각은 곧 &lsquo;나&rsquo;가 아니다.
          </p>
          <p className="text-sm text-gs-muted-soft leading-[1.7] mb-4">
            이 한 문장이 왜 중요한지, 100일 동안 무엇을 훈련하는지
            <br />
            쉽고 직관적으로 알고 가고 싶다면 눌러주세요.
          </p>
          <Link
            href="/study"
            className="inline-block px-7 py-3.5 rounded-full border border-gs-gold bg-transparent text-lg font-bold text-gs-gold shadow-[0_0_16px_rgba(250,204,107,0.7)] hover:shadow-[0_0_22px_rgba(250,204,107,0.95)] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gs-gold/40"
          >
            알고가기 페이지로 이동
          </Link>
        </div>
      </section>
    </div>
  );
}
