import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "요금제",
};

const plans = [
  {
    name: "라이트 AI",
    price: "254,000",
    period: "100일",
    features: [
      "가짜생각 분석기 1회/일",
      "생각쓰레기통",
      "오늘의 루틴",
      "알고가기(학습) 전체",
      "나의성장방",
    ],
    recommended: false,
  },
  {
    name: "프로",
    price: "394,000",
    period: "100일",
    features: [
      "라이트 AI 전체 포함",
      "가짜생각 분석기 2회/일",
      "주 2회 1:1 코칭",
      "행동연습장",
      "명상하기",
    ],
    recommended: true,
  },
  {
    name: "프리미엄",
    price: "694,000",
    period: "100일",
    features: [
      "프로 전체 포함",
      "가짜생각 분석기 4회/일",
      "주 4회 1:1 코칭",
      "전담 상담사 배정",
      "우선 고객 지원",
    ],
    recommended: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <div className="max-w-[880px] mx-auto px-5 pt-8 pb-20">
        {/* 상단 */}
        <div className="text-center mb-6">
          <p className="text-[13px] font-semibold text-[#6b7280] mb-1.5">
            100일 플랜 선택
          </p>
          <h1 className="text-[22px] font-extrabold leading-[1.45] mb-3">
            나에게 맞는 플랜을 선택하세요
          </h1>
          <p className="text-[14px] text-[#4b5563] leading-[1.65]">
            100일간의 인지행동치료 기반 생각 훈련 프로그램
          </p>
        </div>

        {/* 베타 무료 배너 */}
        <div className="max-w-[480px] mx-auto bg-[#111827] text-white rounded-2xl p-3 text-[13px] leading-[1.6] mb-6">
          <b>지금은 베타 기간!</b> 모든 기능을 무료로 체험할 수 있어요.
          <br />
          정식 출시 후 자동 결제되지 않습니다.
          <span className="mt-2.5 inline-block bg-[#dcfce7] text-[#166534] font-black px-2.5 py-1.5 rounded-full text-[12px]">
            베타 기간 0원
          </span>
        </div>

        {/* 플랜 카드 */}
        <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-[20px] p-5 border-2 ${
                plan.recommended
                  ? "border-[#4b7bec] shadow-[0_16px_35px_rgba(15,23,42,0.10)]"
                  : "border-[#e5e7eb]"
              }`}
            >
              {plan.recommended && (
                <span className="inline-block mb-2 bg-[#eef2ff] text-[#4338ca] text-[11px] font-bold px-2.5 py-1 rounded-full">
                  추천
                </span>
              )}
              <h3 className="text-[18px] font-[950] mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[28px] font-black">
                  {plan.price}
                </span>
                <span className="text-[14px] text-[#6b7280]">원</span>
              </div>
              <p className="text-[13px] text-[#9ca3af] mb-4">
                {plan.period}
              </p>
              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-[13px] text-[#374151]"
                  >
                    <span className="text-[#4b7bec] shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={`w-full py-3 rounded-[14px] text-[14px] font-bold cursor-pointer transition-colors ${
                  plan.recommended
                    ? "bg-[#4b7bec] text-white hover:bg-[#3a63db]"
                    : "bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f3f4f6]"
                }`}
              >
                선택하기
              </button>
            </div>
          ))}
        </div>

        {/* 월 구독 */}
        <div className="max-w-[480px] mx-auto mt-6 bg-white border border-[#e5e7eb] rounded-[20px] p-5 text-center">
          <h3 className="text-[16px] font-[950] mb-1">월 구독</h3>
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-[28px] font-black">9,900</span>
            <span className="text-[14px] text-[#6b7280]">원/월</span>
          </div>
          <p className="text-[13px] text-[#9ca3af] mb-3">
            AI 분석 1회/일 · 언제든 해지 가능
          </p>
          <button
            type="button"
            className="w-full py-3 rounded-[14px] border border-[#d1d5db] bg-white text-[14px] font-bold text-[#374151] cursor-pointer hover:bg-[#f3f4f6]"
          >
            월 구독 시작하기
          </button>
        </div>

        <p className="mt-6 text-center text-[12px] text-[#9ca3af] leading-[1.6]">
          결제 관련 문의가 있으시면 언제든 연락주세요.
          <br />
          <Link href="/" className="text-[#4b7bec] font-bold">
            홈으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
