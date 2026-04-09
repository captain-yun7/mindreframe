"use client";

import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { Card, CardTitle } from "@/components/card";

export default function MyPage() {
  // TODO: NextAuth 세션에서 유저 정보 로드
  const user = { nickname: "사용자", plan: "free", email: "" };

  return (
    <PageLayout>
      <PageTitle>마이페이지</PageTitle>

      {/* 프로필 */}
      <Card className="mt-4">
        <CardTitle>프로필</CardTitle>
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-gs-muted">닉네임</span>
            <span className="text-[14px] font-bold">{user.nickname}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-gs-muted">이메일</span>
            <span className="text-[14px] font-bold">
              {user.email || "미등록"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-gs-muted">현재 플랜</span>
            <span className="text-[14px] font-bold uppercase">
              {user.plan}
            </span>
          </div>
        </div>
      </Card>

      {/* 구독/결제 */}
      <Card className="mt-4">
        <CardTitle>구독 & 결제</CardTitle>
        <div className="mt-3 space-y-2">
          <Link
            href="/pricing"
            className="block w-full py-3 text-center rounded-[14px] border border-gs-line bg-white text-[14px] font-bold hover:bg-[#f3f4f6] transition-colors"
          >
            요금제 변경
          </Link>
          <button
            type="button"
            className="w-full py-3 rounded-[14px] border border-gs-line bg-white text-[14px] font-bold text-gs-muted cursor-pointer hover:bg-[#f3f4f6] transition-colors"
          >
            결제 내역 보기
          </button>
        </div>
      </Card>

      {/* 설정 */}
      <Card className="mt-4">
        <CardTitle>설정</CardTitle>
        <div className="mt-3 space-y-2">
          <button
            type="button"
            className="w-full py-3 rounded-[14px] border border-gs-line bg-white text-[14px] font-bold text-gs-muted cursor-pointer hover:bg-[#f3f4f6] transition-colors"
          >
            비밀번호 변경
          </button>
          <button
            type="button"
            className="w-full py-3 rounded-[14px] border border-[#fecaca] bg-[#fee2e2] text-[14px] font-bold text-[#b91c1c] cursor-pointer hover:bg-[#fecaca] transition-colors"
          >
            로그아웃
          </button>
          <button
            type="button"
            className="w-full py-3 rounded-[14px] border border-gs-line bg-white text-[14px] font-bold text-[#9ca3af] cursor-pointer hover:bg-[#f3f4f6] transition-colors"
          >
            회원 탈퇴
          </button>
        </div>
      </Card>
    </PageLayout>
  );
}
