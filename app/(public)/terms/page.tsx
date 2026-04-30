import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관",
};

const SERVICE_NAME = "가짜생각";
const COMPANY_NAME = "마인드시어터";
const CONTACT_EMAIL = "support@mindreframe.net";
const EFFECTIVE_DATE = "2026-05-01";

export default function TermsPage() {
  return (
    <div className="flex-1 bg-gs-bg px-4 py-12">
      <article className="max-w-[820px] mx-auto bg-white rounded-[18px] shadow-gs-card p-8 md:p-12 prose prose-sm md:prose-base max-w-none">
        <h1 className="text-2xl md:text-3xl font-black mb-2">이용약관</h1>
        <p className="text-gs-muted-soft text-sm">시행일: {EFFECTIVE_DATE}</p>

        <h2 className="text-lg font-black mt-8 mb-2">제1조 (목적)</h2>
        <p>
          본 약관은 {COMPANY_NAME}(이하 &ldquo;회사&rdquo;)이 제공하는 {SERVICE_NAME}
          서비스(이하 &ldquo;서비스&rdquo;)의 이용에 관한 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
        </p>

        <h2 className="text-lg font-black mt-8 mb-2">제2조 (정의)</h2>
        <ul className="list-disc pl-6">
          <li>&ldquo;회원&rdquo;: 약관에 동의하고 서비스에 가입한 자</li>
          <li>&ldquo;콘텐츠&rdquo;: 회사가 제공하는 인지행동치료 기반의 글·음원·기능 등</li>
          <li>&ldquo;유료서비스&rdquo;: 회사가 정한 요금을 결제하고 이용하는 서비스</li>
        </ul>

        <h2 className="text-lg font-black mt-8 mb-2">제3조 (약관의 효력)</h2>
        <p>
          본 약관은 서비스 화면에 게시하거나 이메일 등 기타 방법으로 공지함으로써 효력이 발생합니다.
          회사는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 최소 7일(불리한 변경은 30일) 전 공지합니다.
        </p>

        <h2 className="text-lg font-black mt-8 mb-2">제4조 (회원가입)</h2>
        <ul className="list-disc pl-6">
          <li>회원이 되고자 하는 자는 본 약관 및 개인정보처리방침에 동의하고 가입신청을 합니다.</li>
          <li>회사는 다음 각 호에 해당하는 신청을 거부할 수 있습니다: 타인의 정보 도용, 허위 정보 기재, 사회질서·공공복리 저해 등.</li>
        </ul>

        <h2 className="text-lg font-black mt-8 mb-2">제5조 (서비스의 제공 및 변경)</h2>
        <ul className="list-disc pl-6">
          <li>회사는 회원에게 인지행동치료 기반 콘텐츠, AI 분석, 명상·행동연습 기록 등의 서비스를 제공합니다.</li>
          <li>회사는 운영상·기술상의 필요에 따라 서비스의 일부 또는 전부를 변경·중단할 수 있으며, 사전 공지합니다(긴급한 경우 사후 공지).</li>
        </ul>

        <h2 className="text-lg font-black mt-8 mb-2">제6조 (의료적 책임의 한계)</h2>
        <p>
          본 서비스는 의료행위가 아니며, 정신건강의학과 진단·치료를 대체하지 않습니다. 심각한 우울·불안·자살 충동이 있다면
          전문의의 진료 또는 정신건강복지센터(1577-0199), 자살예방상담전화(1393)에 문의하시기 바랍니다.
        </p>

        <h2 className="text-lg font-black mt-8 mb-2">제7조 (유료서비스 및 환불)</h2>
        <ul className="list-disc pl-6">
          <li>유료서비스의 요금·결제방법·이용기간은 결제 화면에서 안내합니다.</li>
          <li>결제 후 7일 이내, 콘텐츠 미사용 상태일 경우 전액 환불 가능합니다.</li>
          <li>구독형 상품의 경우 다음 결제일 전까지 해지 시 이후 결제가 청구되지 않습니다.</li>
        </ul>

        <h2 className="text-lg font-black mt-8 mb-2">제8조 (회원의 의무)</h2>
        <ul className="list-disc pl-6">
          <li>타인의 정보 도용·계정 양도·서비스 부정 이용 금지</li>
          <li>저작권·지식재산권 침해 금지</li>
          <li>회사 운영을 방해하는 행위 금지</li>
        </ul>

        <h2 className="text-lg font-black mt-8 mb-2">제9조 (계약 해지·이용 제한)</h2>
        <p>
          회원은 언제든지 마이페이지 또는 고객센터를 통해 회원 탈퇴할 수 있습니다.
          회사는 회원이 본 약관을 위반한 경우 사전 통지 후 이용을 제한하거나 계약을 해지할 수 있습니다.
        </p>

        <h2 className="text-lg font-black mt-8 mb-2">제10조 (책임의 한계)</h2>
        <ul className="list-disc pl-6">
          <li>천재지변·정전·통신장애 등 회사의 귀책사유 없는 사유로 인한 서비스 중단 시 책임을 지지 않습니다.</li>
          <li>회원이 서비스 이용을 통해 얻은 정보·자료에 따른 결정으로 인해 발생한 손해에 대해 회사는 책임을 지지 않습니다.</li>
        </ul>

        <h2 className="text-lg font-black mt-8 mb-2">제11조 (분쟁 해결)</h2>
        <p>
          서비스 이용으로 발생한 분쟁은 회사와 회원 간 협의를 통해 해결하되, 협의가 어려울 경우 서울중앙지방법원을 관할 법원으로 합니다.
        </p>

        <h2 className="text-lg font-black mt-8 mb-2">문의</h2>
        <p>
          이메일: <a href={`mailto:${CONTACT_EMAIL}`} className="text-gs-blue-hover underline">{CONTACT_EMAIL}</a>
        </p>
      </article>
    </div>
  );
}
