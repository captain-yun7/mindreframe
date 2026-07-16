import type { Metadata } from "next";
import Link from "next/link";
import { computeRecommendedPlan, normalizePlan, type Plan } from "@/lib/auth/plan";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserProfileForGuard } from "@/lib/auth/user-profile-guard";
import { CouponRedeemForm } from "./coupon-redeem-form";
import { PaymentNoticePopup } from "./payment-notice-popup";
import { PageFade } from "@/components/motion/page-fade";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerList, StaggerItem } from "@/components/motion/stagger-list";

/** K3·F162 — A안: 현재 = 비활성 라벨, 상위 = 업그레이드, 하위 = 그대로 (선택 가능). */
const PLAN_RANK_FOR_CARD: Record<Plan, number> = {
  free: 0,
  light: 1,
  pro: 2,
  premium: 3,
};

export const metadata: Metadata = {
  title: "요금제",
  description:
    "100일 인지행동치료 프로그램. 라이트 254,000원 / 프로 394,000원 / 프리미엄 694,000원. 가짜생각 분석기·생각쓰레기통·1:1 코칭·행동연습장·명상·오늘의 루틴 모두 포함.",
};

const PLAN_LABEL: Record<string, string> = {
  light: "라이트",
  pro: "프로",
  premium: "프리미엄",
};

interface PlanCard {
  key: Plan;
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended: boolean;
}

// K3·F161 공통 5종 (모든 플랜)
const COMMON_FEATURES = [
  "행동연습장",
  "명상하기",
  "오늘의 루틴",
  "알고가기(학습) 전체",
  "나의성장방",
];

const FALLBACK_PLANS: PlanCard[] = [
  {
    key: "light",
    name: "라이트",
    price: "254,000",
    period: "100일",
    features: [
      "가짜생각 분석기 5회/일",
      "생각쓰레기통 5회/일",
      "1:1 코칭 1회/주",
      ...COMMON_FEATURES,
    ],
    recommended: false,
  },
  {
    key: "pro",
    name: "프로",
    price: "394,000",
    period: "100일",
    features: [
      "가짜생각 분석기 7회/일",
      "생각쓰레기통 7회/일",
      "1:1 코칭 2회/주",
      ...COMMON_FEATURES,
    ],
    recommended: true,
  },
  {
    key: "premium",
    name: "프리미엄",
    price: "694,000",
    period: "100일",
    features: [
      "가짜생각 분석기 무제한/일",
      "생각쓰레기통 무제한/일",
      "1:1 코칭 4회/주",
      ...COMMON_FEATURES,
      "우선 고객 지원",
    ],
    recommended: false,
  },
];

interface PlanRow {
  slug: string;
  name: string;
  amount: number;
  duration_days: number;
  recommended: boolean;
  features: unknown;
  sort_order: number;
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; required?: string }>;
}) {
  const params = await searchParams;
  const requiredPlan = params.required && PLAN_LABEL[params.required] ? params.required : null;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // F88 — DB plans fetch (마이그 미적용 시 정적 fallback)
  const plansRes = await supabase
    .from("plans")
    .select("slug, name, amount, duration_days, recommended, features, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  let plans: PlanCard[];
  if (
    plansRes.error ||
    !plansRes.data ||
    plansRes.data.length === 0
  ) {
    plans = FALLBACK_PLANS;
  } else {
    plans = (plansRes.data as PlanRow[])
      .filter((p) => p.slug === "light" || p.slug === "pro" || p.slug === "premium")
      .map((p) => ({
        key: p.slug as Plan,
        name: p.name,
        price: p.amount.toLocaleString("ko-KR"),
        period: `${p.duration_days}일`,
        features: Array.isArray(p.features) ? (p.features as string[]) : [],
        recommended: p.recommended,
      }));
  }

  // 월 구독은 2회 이상 결제자만 노출 (재구매 충성 고객 한정)
  let showMonthly = false;
  let surveyRecommended: Plan | null = null;
  let currentPlan: Plan = "free";
  if (user) {
    const [paymentsRes, surveyRes, profile] = await Promise.all([
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("survey_responses")
        .select("depression_score, anxiety_score")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getUserProfileForGuard(user.id),
    ]);
    showMonthly = (paymentsRes.count ?? 0) >= 2;

    if (surveyRes.data) {
      surveyRecommended = computeRecommendedPlan(
        surveyRes.data.depression_score ?? 0,
        surveyRes.data.anxiety_score ?? 0,
      );
    }

    currentPlan = normalizePlan(profile?.plan ?? null);
  }
  const currentRank = PLAN_RANK_FOR_CARD[currentPlan];

  // requiredPlan(가드된 페이지 진입) > 설문 점수 > DB recommended > 'pro' 기본
  const allowedPlans: Plan[] = ["light", "pro", "premium"];
  const dbRecommended = plans.find((p) => p.recommended)?.key ?? null;
  const effectiveRecommended: Plan =
    requiredPlan && allowedPlans.includes(requiredPlan as Plan)
      ? (requiredPlan as Plan)
      : (surveyRecommended ?? dbRecommended ?? "pro");

  return (
    <PageFade className="min-h-screen bg-gs-navy-50/40">
      <PaymentNoticePopup />
      <div className="max-w-[960px] mx-auto px-5 pt-12 md:pt-16 pb-20">
        {/* 상단 */}
        <FadeIn>
          <div className="text-center mb-10">
            <p className="text-sm font-bold tracking-[-0.01em] text-gs-navy-bright mb-3">
              💎 100일 플랜 선택
            </p>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-gs-navy leading-[1.15] mb-4">
              당신에게 맞는
              <br />
              100일을 골라보세요
            </h1>
            <p className="text-base md:text-lg text-gs-muted-soft leading-relaxed">
              100일간의 인지행동치료 기반 생각 훈련 프로그램
            </p>
          </div>
        </FadeIn>

        {requiredPlan && (
          <div
            role="alert"
            className="max-w-[640px] mx-auto mb-4 px-4 py-3 rounded-toss-button bg-gs-warning-bg border border-gs-warning-border text-gs-warning text-sm font-medium"
          >
            요청하신 페이지는 <b>{PLAN_LABEL[requiredPlan]}</b> 이상 플랜에서 이용 가능합니다. 아래에서 플랜을 선택해주세요.
          </div>
        )}

        {/* 플랜 카드 */}
        <StaggerList
          stagger={0.1}
          className="grid grid-cols-3 gap-5 max-sm:grid-cols-1 pt-4"
        >
          {plans.map((plan) => {
            const isRecommended = plan.key === effectiveRecommended;
            const planRank = PLAN_RANK_FOR_CARD[plan.key];
            // K3·F162 A안 분기. F236 — 무료(free) 사용자는 "업그레이드" 아닌 "선택하기".
            const isCurrent = user != null && plan.key === currentPlan;
            const isUpgrade =
              user != null && currentPlan !== "free" && planRank > currentRank;
            return (
              <StaggerItem key={plan.name}>
                <div
                  data-testid={`plan-card-${plan.key}`}
                  data-recommended={isRecommended ? "true" : "false"}
                  data-current={isCurrent ? "true" : "false"}
                  className={`relative h-full bg-white rounded-toss-card p-6 border-2 transition-all ${
                    isCurrent
                      ? "border-gs-gold-border ring-4 ring-gs-gold/15 shadow-toss-card"
                      : isRecommended
                      ? "border-gs-navy-bright ring-4 ring-gs-navy-bright/15 scale-[1.03] shadow-toss-card-hover"
                      : "border-gs-line-soft shadow-toss-card hover:-translate-y-1 hover:shadow-toss-card-hover"
                  }`}
                >
                  {isCurrent ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-block bg-gs-gold text-gs-navy text-[11px] font-bold px-3 py-1 rounded-full shadow-toss-card whitespace-nowrap">
                      ✨ 현재 이용 중
                    </span>
                  ) : isRecommended ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-block bg-gs-navy-bright text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-toss-card whitespace-nowrap">
                      ⭐ 당신에게 추천
                    </span>
                  ) : null}
                  <h3 className="text-xl font-extrabold tracking-[-0.02em] mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-extrabold tracking-[-0.03em]">
                      {plan.price}
                    </span>
                    <span className="text-sm text-gs-muted-soft">원</span>
                  </div>
                  <p className="text-[13px] text-gs-muted-light mb-5">
                    {plan.period}
                  </p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-[13px] text-gs-text-soft"
                      >
                        <span className="text-gs-navy-bright shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div
                      aria-disabled="true"
                      className="block w-full py-3.5 rounded-toss-button text-sm font-bold text-center bg-gs-surface-muted border border-gs-line-soft text-gs-muted-soft cursor-not-allowed select-none"
                    >
                      현재 이용 중
                    </div>
                  ) : (
                    <Link
                      href={`/checkout?plan=${plan.key}`}
                      className={`block w-full py-3.5 rounded-toss-button text-sm font-bold text-center cursor-pointer transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40 focus-visible:ring-offset-2 ${
                        isUpgrade
                          ? "bg-gs-navy-bright text-white hover:shadow-toss-card-hover"
                          : isRecommended
                          ? "bg-gs-navy-bright text-white hover:shadow-toss-card-hover"
                          : "bg-white border border-gs-line-mid text-gs-text-soft hover:bg-gs-navy-50 hover:shadow-toss-card"
                      }`}
                    >
                      {isUpgrade ? "업그레이드" : "선택하기"}
                    </Link>
                  )}
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
        {/* 월 구독 — 2회 이상 결제자 한정 노출 */}
        {showMonthly && (
          <FadeIn>
            <div className="max-w-[480px] mx-auto mt-8 bg-white border border-gs-line-soft rounded-toss-card p-6 text-center shadow-toss-card">
              <div className="text-[11px] font-bold text-gs-navy-bright mb-1">
                재구독 회원 전용
              </div>
              <h3 className="text-base font-extrabold tracking-[-0.02em] mb-1">월 구독</h3>
              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-3xl font-extrabold tracking-[-0.03em]">9,900</span>
                <span className="text-sm text-gs-muted-soft">원/월</span>
              </div>
              <p className="text-[13px] text-gs-muted-light mb-4">
                가짜생각 분석기 1회/일 · 언제든 해지 가능
              </p>
              <button
                type="button"
                className="w-full py-3 rounded-toss-button border border-gs-line-mid bg-white text-sm font-bold text-gs-text-soft cursor-pointer hover:bg-gs-navy-50 hover:-translate-y-0.5 hover:shadow-toss-card transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-navy-bright/40 focus-visible:ring-offset-2"
              >
                월 구독 시작하기
              </button>
            </div>
          </FadeIn>
        )}

        {/* 쿠폰 코드 입력 — 로그인 사용자만 */}
        {user && <CouponRedeemForm />}

        {/* 환불 정책 요약 */}
        <p className="mt-8 text-center text-xs text-gs-muted-light leading-[1.6]">
          무료로 써보세요. 주 1회 사용했는데 효과 없으면 100% 환불해드려요.{" "}
          <Link href="/terms" className="text-gs-navy-bright font-bold hover:underline">
            자세히
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-gs-muted-light leading-[1.6]">
          결제 관련 문의가 있으시면 언제든 연락주세요.
          <br />
          <Link href="/" className="text-gs-navy-bright font-bold hover:underline">
            홈으로 돌아가기
          </Link>
        </p>
      </div>
    </PageFade>
  );
}
