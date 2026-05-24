import type { Metadata } from "next";
import Link from "next/link";
import { computeRecommendedPlan, type Plan } from "@/lib/auth/plan";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "요금제",
};

const PLAN_LABEL: Record<string, string> = {
  light: "라이트",
  pro: "프로",
  premium: "프리미엄",
};

const plans: Array<{
  key: Plan;
  name: string;
  price: string;
  period: string;
  features: string[];
}> = [
  {
    key: "light",
    name: "라이트",
    price: "254,000",
    period: "100일",
    features: [
      "가짜생각 분석기 5회/일",
      "주 1회 1:1 코칭",
      "생각쓰레기통",
      "오늘의 루틴",
      "알고가기(학습) 전체",
      "나의성장방",
    ],
  },
  {
    key: "pro",
    name: "프로",
    price: "394,000",
    period: "100일",
    features: [
      "라이트 전체 포함",
      "가짜생각 분석기 7회/일",
      "주 2회 1:1 코칭",
      "행동연습장",
      "명상하기",
    ],
  },
  {
    key: "premium",
    name: "프리미엄",
    price: "694,000",
    period: "100일",
    features: [
      "프로 전체 포함",
      "가짜생각 분석기 무제한/일",
      "주 4회 1:1 코칭",
      "우선 고객 지원",
    ],
  },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; required?: string }>;
}) {
  const params = await searchParams;
  const requiredPlan = params.required && PLAN_LABEL[params.required] ? params.required : null;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 월 구독은 2회 이상 결제자만 노출 (재구매 충성 고객 한정)
  let showMonthly = false;
  let surveyRecommended: Plan | null = null;
  if (user) {
    const [paymentsRes, surveyRes] = await Promise.all([
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
    ]);
    showMonthly = (paymentsRes.count ?? 0) >= 2;

    if (surveyRes.data) {
      surveyRecommended = computeRecommendedPlan(
        surveyRes.data.depression_score ?? 0,
        surveyRes.data.anxiety_score ?? 0,
      );
    }
  }

  // requiredPlan(가드된 페이지 진입) > 설문 점수 > 비로그인/설문 없음 → pro 기본 추천
  const allowedPlans: Plan[] = ["light", "pro", "premium"];
  const effectiveRecommended: Plan =
    requiredPlan && allowedPlans.includes(requiredPlan as Plan)
      ? (requiredPlan as Plan)
      : (surveyRecommended ?? "pro");

  return (
    <div className="min-h-screen bg-gs-surface-muted">
      <div className="max-w-[880px] mx-auto px-5 pt-8 pb-20">
        {/* 상단 */}
        <div className="text-center mb-6">
          <p className="text-[13px] font-semibold text-gs-muted-soft mb-2">
            100일 플랜 선택
          </p>
          <h1 className="text-2xl font-extrabold leading-[1.45] mb-3">
            나에게 맞는 플랜을 선택하세요
          </h1>
          <p className="text-sm text-gs-text-soft leading-[1.65]">
            100일간의 인지행동치료 기반 생각 훈련 프로그램
          </p>
        </div>

        {requiredPlan && (
          <div
            role="alert"
            className="max-w-[640px] mx-auto mb-4 px-4 py-3 rounded-xl bg-gs-warning-bg border border-gs-warning-border text-gs-warning text-sm font-medium"
          >
            요청하신 페이지는 <b>{PLAN_LABEL[requiredPlan]}</b> 이상 플랜에서 이용 가능합니다. 아래에서 플랜을 선택해주세요.
          </div>
        )}

        {/* 플랜 카드 */}
        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1 pt-4">
          {plans.map((plan) => {
            const isRecommended = plan.key === effectiveRecommended;
            return (
              <div
                key={plan.name}
                data-testid={`plan-card-${plan.key}`}
                data-recommended={isRecommended ? "true" : "false"}
                className={`relative bg-white rounded-[18px] p-5 border-2 shadow-gs-card transition-all ${
                  isRecommended
                    ? "border-gs-blue ring-4 ring-gs-blue/20 scale-[1.03] shadow-gs-card-hover"
                    : "border-gs-line-soft opacity-90 hover:opacity-100"
                }`}
              >
                {isRecommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-block bg-gs-blue text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-gs-card whitespace-nowrap">
                    ⭐ 당신에게 추천
                  </span>
                )}
                <h3 className="text-lg font-[950] mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black">
                    {plan.price}
                  </span>
                  <span className="text-sm text-gs-muted-soft">원</span>
                </div>
                <p className="text-[13px] text-gs-muted-light mb-4">
                  {plan.period}
                </p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-[13px] text-gs-text-soft"
                    >
                      <span className="text-gs-blue shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/checkout?plan=${plan.key}`}
                  className={`block w-full py-3 rounded-[14px] text-sm font-bold text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2 ${
                    isRecommended
                      ? "bg-gs-blue text-white hover:bg-gs-blue-hover"
                      : "bg-white border border-gs-line-mid text-gs-text-soft hover:bg-gs-surface-mid"
                  }`}
                >
                  선택하기
                </Link>
              </div>
            );
          })}
        </div>
        {/* 월 구독 — 2회 이상 결제자 한정 노출 */}
        {showMonthly && (
          <div className="max-w-[480px] mx-auto mt-6 bg-white border border-gs-line-soft rounded-[18px] p-5 text-center shadow-gs-card">
            <div className="text-[11px] font-bold text-gs-blue mb-1">재구독 회원 전용</div>
            <h3 className="text-base font-[950] mb-1">월 구독</h3>
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-3xl font-black">9,900</span>
              <span className="text-sm text-gs-muted-soft">원/월</span>
            </div>
            <p className="text-[13px] text-gs-muted-light mb-4">
              가짜생각 분석기 1회/일 · 언제든 해지 가능
            </p>
            <button
              type="button"
              className="w-full py-3 rounded-[14px] border border-gs-line-mid bg-white text-sm font-bold text-gs-text-soft cursor-pointer hover:bg-gs-surface-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gs-blue/40 focus-visible:ring-offset-2"
            >
              월 구독 시작하기
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gs-muted-light leading-[1.6]">
          결제 관련 문의가 있으시면 언제든 연락주세요.
          <br />
          <Link href="/" className="text-gs-blue font-bold hover:text-gs-blue-hover">
            홈으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
