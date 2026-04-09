"use client";

import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { Card, CardTitle, CardDescription } from "@/components/card";

const badges = [
  { icon: "🌱", title: "첫 시작", desc: "첫 가짜생각 분석 완료", earned: true },
  { icon: "🔥", title: "3일 연속", desc: "3일 연속 루틴 완료", earned: true },
  { icon: "⭐", title: "7일 연속", desc: "7일 연속 루틴 완료", earned: false },
  { icon: "🏆", title: "30일 돌파", desc: "30일 누적 기록", earned: false },
  { icon: "💡", title: "사고 전환", desc: "대안사고 10개 달성", earned: false },
  { icon: "🧘", title: "명상 마스터", desc: "명상 20회 달성", earned: false },
  { icon: "📝", title: "기록왕", desc: "감사일기 30개 달성", earned: false },
  { icon: "🎯", title: "100일 완주", desc: "100일 프로그램 완주", earned: false },
];

export default function ProgressPage() {
  return (
    <PageLayout>
      <PageTitle>나의성장방</PageTitle>
      <PageLead>꾸준함이 만드는 변화를 확인해보세요.</PageLead>

      {/* KPI 카드 */}
      <div className="mt-4 grid grid-cols-4 gap-3 max-sm:grid-cols-2">
        {[
          { label: "총 훈련일수", value: "0일" },
          { label: "연속 스트릭", value: "0일" },
          { label: "분석 횟수", value: "0회" },
          { label: "대안사고", value: "0개" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-[14px] p-4 border border-gs-line text-center"
          >
            <div className="text-[12px] text-gs-muted font-[750]">
              {kpi.label}
            </div>
            <div className="text-[20px] font-[950] mt-1">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* 감정 변화 그래프 */}
      <Card className="mt-4">
        <CardTitle>감정 변화 추이</CardTitle>
        <CardDescription>
          루틴에서 입력한 감정 점수의 변화를 확인해보세요.
        </CardDescription>
        <div className="mt-4 h-[200px] bg-[#f9fafb] rounded-[14px] flex items-center justify-center text-gs-muted text-[13px]">
          {/* TODO: Recharts 그래프 연동 */}
          데이터가 쌓이면 감정 변화 그래프가 표시됩니다.
        </div>
      </Card>

      {/* 배지 */}
      <Card className="mt-4">
        <CardTitle>획득 배지</CardTitle>
        <div className="mt-3 grid grid-cols-4 gap-3 max-sm:grid-cols-2">
          {badges.map((badge) => (
            <div
              key={badge.title}
              className={`rounded-[14px] p-3 text-center border ${
                badge.earned
                  ? "bg-gradient-to-br from-[#fef9c3] to-[#fef3c7] border-gs-gold-border"
                  : "bg-[#f9fafb] border-gs-line opacity-50"
              }`}
            >
              <div className="text-[28px]">{badge.icon}</div>
              <div className="text-[12px] font-[950] mt-1">{badge.title}</div>
              <div className="text-[11px] text-gs-muted">{badge.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 대안적 사고 카드 */}
      <Card className="mt-4">
        <CardTitle>대안적 사고 카드</CardTitle>
        <CardDescription>
          가짜생각 분석기에서 찾은 대안적 사고들이 모입니다.
        </CardDescription>
        <div className="mt-3 text-center text-gs-muted text-[13px] py-8">
          아직 저장된 대안사고가 없습니다.
          <br />
          가짜생각 분석기를 사용해보세요.
        </div>
      </Card>
    </PageLayout>
  );
}
