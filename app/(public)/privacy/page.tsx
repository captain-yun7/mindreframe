import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
};

const SERVICE_NAME = "가짜생각";
const COMPANY_NAME = "마인드시어터";
const CONTACT_EMAIL = "support@mindreframe.net";
const EFFECTIVE_DATE = "2026-05-01";

export default function PrivacyPage() {
  return (
    <div className="flex-1 bg-gs-bg px-4 py-12">
      <article className="max-w-[820px] mx-auto bg-white rounded-[18px] shadow-[0_18px_40px_rgba(15,23,42,0.06)] p-8 md:p-12 prose prose-sm md:prose-base max-w-none">
        <h1 className="text-[24px] md:text-[28px] font-black mb-2">개인정보처리방침</h1>
        <p className="text-[#6b7280] text-sm">시행일: {EFFECTIVE_DATE}</p>

        <p className="mt-6">
          {COMPANY_NAME}(이하 &ldquo;회사&rdquo;)은(는) 이용자의 개인정보를 중요시하며,
          「개인정보 보호법」 등 관련 법령을 준수합니다. 본 방침은 {SERVICE_NAME}
          서비스(이하 &ldquo;서비스&rdquo;) 이용에 따른 개인정보의 수집·이용·보관·파기에 관한
          사항을 규정합니다.
        </p>

        <h2 className="text-[18px] font-black mt-8 mb-2">1. 수집하는 개인정보 항목</h2>
        <p>회사는 다음의 정보를 수집합니다.</p>
        <ul className="list-disc pl-6">
          <li>
            <b>회원가입·로그인 시</b>: 이메일, 닉네임, 프로필 이미지(소셜 로그인 시 해당 제공자가 전달)
          </li>
          <li>
            <b>서비스 이용 중</b>: 작성한 생각·감정 기록, 명상/행동연습 기록, 분석기 입력 내용,
            기기 정보, 접속 기록(IP·로그)
          </li>
          <li>
            <b>결제 시</b>: 결제 처리에 필요한 최소 정보(결제 대행사 토스페이먼츠를 통해 처리되며
            카드번호 등 민감 정보는 회사 서버에 저장되지 않습니다)
          </li>
        </ul>

        <h2 className="text-[18px] font-black mt-8 mb-2">2. 개인정보의 수집·이용 목적</h2>
        <ul className="list-disc pl-6">
          <li>회원 식별 및 본인 확인, 서비스 제공·운영</li>
          <li>사용자 맞춤형 콘텐츠(루틴·명상·분석 결과) 제공</li>
          <li>요금 결제 및 환불 처리, 영수증 발송</li>
          <li>서비스 개선을 위한 통계 분석(개인 식별 불가능한 형태로 처리)</li>
          <li>고객 문의 응대, 공지사항 안내</li>
        </ul>

        <h2 className="text-[18px] font-black mt-8 mb-2">3. 보유 및 이용기간</h2>
        <ul className="list-disc pl-6">
          <li>회원 탈퇴 시 즉시 파기. 단, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관 후 파기.</li>
          <li>전자상거래법: 계약·청약철회 5년, 대금결제 5년, 소비자 불만 처리 3년</li>
          <li>통신비밀보호법: 로그 기록 3개월</li>
        </ul>

        <h2 className="text-[18px] font-black mt-8 mb-2">4. 제3자 제공</h2>
        <p>
          회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 다음의 경우 예외로 합니다.
        </p>
        <ul className="list-disc pl-6">
          <li>이용자가 사전 동의한 경우</li>
          <li>법령 또는 수사기관의 적법한 요청이 있는 경우</li>
        </ul>

        <h2 className="text-[18px] font-black mt-8 mb-2">5. 처리위탁</h2>
        <p>서비스 제공을 위해 다음 업체에 일부 처리를 위탁합니다.</p>
        <table className="w-full border-collapse my-2 text-sm">
          <thead>
            <tr className="bg-[#f9fafb]">
              <th className="border border-[#e5e7eb] p-2 text-left">수탁자</th>
              <th className="border border-[#e5e7eb] p-2 text-left">위탁 업무</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#e5e7eb] p-2">Supabase Inc.</td>
              <td className="border border-[#e5e7eb] p-2">데이터베이스, 인증, 파일 저장</td>
            </tr>
            <tr>
              <td className="border border-[#e5e7eb] p-2">Vercel Inc.</td>
              <td className="border border-[#e5e7eb] p-2">웹 서비스 호스팅</td>
            </tr>
            <tr>
              <td className="border border-[#e5e7eb] p-2">OpenAI, L.L.C.</td>
              <td className="border border-[#e5e7eb] p-2">AI 기반 분석(생각 입력 텍스트만 처리, 식별정보 미전달)</td>
            </tr>
            <tr>
              <td className="border border-[#e5e7eb] p-2">㈜토스페이먼츠</td>
              <td className="border border-[#e5e7eb] p-2">결제 처리</td>
            </tr>
          </tbody>
        </table>

        <h2 className="text-[18px] font-black mt-8 mb-2">6. 이용자의 권리</h2>
        <p>이용자는 언제든지 개인정보 열람·수정·삭제·처리정지를 요청할 수 있으며, 회원 탈퇴를 통해 즉시 파기 요청이 가능합니다.</p>

        <h2 className="text-[18px] font-black mt-8 mb-2">7. 개인정보 보호책임자</h2>
        <p>
          개인정보 처리에 관한 문의·민원은 아래 연락처로 부탁드립니다.
        </p>
        <ul className="list-disc pl-6">
          <li>책임자: 개인정보보호 담당자</li>
          <li>이메일: <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#1d4ed8] underline">{CONTACT_EMAIL}</a></li>
        </ul>

        <h2 className="text-[18px] font-black mt-8 mb-2">8. 개정</h2>
        <p>본 방침은 법령·서비스 변경에 따라 개정될 수 있으며, 개정 시 최소 7일 전 공지합니다.</p>
      </article>
    </div>
  );
}
