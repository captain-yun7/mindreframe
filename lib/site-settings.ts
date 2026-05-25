import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * F89 — 사이트 전역 설정 fetch + placeholder 치환 헬퍼.
 * 마이그레이션 미적용 환경에서는 FALLBACK 사용.
 */

export const FALLBACK_TERMS_HTML = `
<h2 class="text-lg font-black mt-8 mb-2">제1조 (목적)</h2>
<p>본 약관은 {{company_name}}(이하 &ldquo;회사&rdquo;)이 제공하는 {{service_name}} 서비스(이하 &ldquo;서비스&rdquo;)의 이용에 관한 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>

<h2 class="text-lg font-black mt-8 mb-2">제2조 (정의)</h2>
<ul class="list-disc pl-6">
  <li>&ldquo;회원&rdquo;: 약관에 동의하고 서비스에 가입한 자</li>
  <li>&ldquo;콘텐츠&rdquo;: 회사가 제공하는 인지행동치료 기반의 글·음원·기능 등</li>
  <li>&ldquo;유료서비스&rdquo;: 회사가 정한 요금을 결제하고 이용하는 서비스</li>
</ul>

<h2 class="text-lg font-black mt-8 mb-2">제3조 (약관의 효력)</h2>
<p>본 약관은 서비스 화면에 게시하거나 이메일 등 기타 방법으로 공지함으로써 효력이 발생합니다. 회사는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 최소 7일(불리한 변경은 30일) 전 공지합니다.</p>

<h2 class="text-lg font-black mt-8 mb-2">제4조 (회원가입)</h2>
<ul class="list-disc pl-6">
  <li>회원이 되고자 하는 자는 본 약관 및 개인정보처리방침에 동의하고 가입신청을 합니다.</li>
  <li>회사는 다음 각 호에 해당하는 신청을 거부할 수 있습니다: 타인의 정보 도용, 허위 정보 기재, 사회질서·공공복리 저해 등.</li>
</ul>

<h2 class="text-lg font-black mt-8 mb-2">제5조 (서비스의 제공 및 변경)</h2>
<ul class="list-disc pl-6">
  <li>회사는 회원에게 인지행동치료 기반 콘텐츠, 가짜생각 분석, 명상·행동연습 기록 등의 서비스를 제공합니다.</li>
  <li>회사는 운영상·기술상의 필요에 따라 서비스의 일부 또는 전부를 변경·중단할 수 있으며, 사전 공지합니다(긴급한 경우 사후 공지).</li>
</ul>

<h2 class="text-lg font-black mt-8 mb-2">제6조 (의료적 책임의 한계)</h2>
<p>본 서비스는 의료행위가 아니며, 정신건강의학과 진단·치료를 대체하지 않습니다. 심각한 우울·불안·자살 충동이 있다면 전문의의 진료 또는 정신건강복지센터(1577-0199), 자살예방상담전화(1393)에 문의하시기 바랍니다.</p>

<h2 class="text-lg font-black mt-8 mb-2">제7조 (유료서비스 및 환불)</h2>
<ul class="list-disc pl-6">
  <li>유료서비스의 요금·결제방법·이용기간은 결제 화면에서 안내합니다.</li>
  <li>결제 후 7일 이내, 콘텐츠 미사용 상태일 경우 전액 환불 가능합니다.</li>
  <li>구독형 상품의 경우 다음 결제일 전까지 해지 시 이후 결제가 청구되지 않습니다.</li>
</ul>

<h2 class="text-lg font-black mt-8 mb-2">제8조 (회원의 의무)</h2>
<ul class="list-disc pl-6">
  <li>타인의 정보 도용·계정 양도·서비스 부정 이용 금지</li>
  <li>저작권·지식재산권 침해 금지</li>
  <li>회사 운영을 방해하는 행위 금지</li>
</ul>

<h2 class="text-lg font-black mt-8 mb-2">제9조 (계약 해지·이용 제한)</h2>
<p>회원은 언제든지 마이페이지 또는 고객센터를 통해 회원 탈퇴할 수 있습니다. 회사는 회원이 본 약관을 위반한 경우 사전 통지 후 이용을 제한하거나 계약을 해지할 수 있습니다.</p>

<h2 class="text-lg font-black mt-8 mb-2">제10조 (책임의 한계)</h2>
<ul class="list-disc pl-6">
  <li>천재지변·정전·통신장애 등 회사의 귀책사유 없는 사유로 인한 서비스 중단 시 책임을 지지 않습니다.</li>
  <li>회원이 서비스 이용을 통해 얻은 정보·자료에 따른 결정으로 인해 발생한 손해에 대해 회사는 책임을 지지 않습니다.</li>
</ul>

<h2 class="text-lg font-black mt-8 mb-2">제11조 (분쟁 해결)</h2>
<p>서비스 이용으로 발생한 분쟁은 회사와 회원 간 협의를 통해 해결하되, 협의가 어려울 경우 서울중앙지방법원을 관할 법원으로 합니다.</p>

<h2 class="text-lg font-black mt-8 mb-2">문의</h2>
<p>이메일: <a href="mailto:{{contact_email}}" class="text-gs-blue-hover underline">{{contact_email}}</a></p>
`;

export const FALLBACK_PRIVACY_HTML = `
<p class="mt-6">{{company_name}}(이하 &ldquo;회사&rdquo;)은(는) 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수합니다. 본 방침은 {{service_name}} 서비스(이하 &ldquo;서비스&rdquo;) 이용에 따른 개인정보의 수집·이용·보관·파기에 관한 사항을 규정합니다.</p>

<h2 class="text-lg font-black mt-8 mb-2">1. 수집하는 개인정보 항목</h2>
<p>회사는 다음의 정보를 수집합니다.</p>
<ul class="list-disc pl-6">
  <li><b>회원가입·로그인 시</b>: 이메일, 닉네임, 프로필 이미지(소셜 로그인 시 해당 제공자가 전달)</li>
  <li><b>서비스 이용 중</b>: 작성한 생각·감정 기록, 명상/행동연습 기록, 분석기 입력 내용, 기기 정보, 접속 기록(IP·로그)</li>
  <li><b>결제 시</b>: 결제 처리에 필요한 최소 정보(결제 대행사 토스페이먼츠를 통해 처리되며 카드번호 등 민감 정보는 회사 서버에 저장되지 않습니다)</li>
</ul>

<h2 class="text-lg font-black mt-8 mb-2">2. 개인정보의 수집·이용 목적</h2>
<ul class="list-disc pl-6">
  <li>회원 식별 및 본인 확인, 서비스 제공·운영</li>
  <li>사용자 맞춤형 콘텐츠(루틴·명상·분석 결과) 제공</li>
  <li>요금 결제 및 환불 처리, 영수증 발송</li>
  <li>서비스 개선을 위한 통계 분석(개인 식별 불가능한 형태로 처리)</li>
  <li>고객 문의 응대, 공지사항 안내</li>
</ul>

<h2 class="text-lg font-black mt-8 mb-2">3. 보유 및 이용기간</h2>
<ul class="list-disc pl-6">
  <li>회원 탈퇴 시 즉시 파기. 단, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관 후 파기.</li>
  <li>전자상거래법: 계약·청약철회 5년, 대금결제 5년, 소비자 불만 처리 3년</li>
  <li>통신비밀보호법: 로그 기록 3개월</li>
</ul>

<h2 class="text-lg font-black mt-8 mb-2">4. 제3자 제공</h2>
<p>회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 다음의 경우 예외로 합니다.</p>
<ul class="list-disc pl-6">
  <li>이용자가 사전 동의한 경우</li>
  <li>법령 또는 수사기관의 적법한 요청이 있는 경우</li>
</ul>

<h2 class="text-lg font-black mt-8 mb-2">5. 처리위탁</h2>
<p>서비스 제공을 위해 다음 업체에 일부 처리를 위탁합니다.</p>
<table class="w-full border-collapse my-2 text-sm">
  <thead>
    <tr class="bg-gs-surface-muted">
      <th class="border border-gs-line-soft p-2 text-left">수탁자</th>
      <th class="border border-gs-line-soft p-2 text-left">위탁 업무</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border border-gs-line-soft p-2">Supabase Inc.</td>
      <td class="border border-gs-line-soft p-2">데이터베이스, 인증, 파일 저장</td>
    </tr>
    <tr>
      <td class="border border-gs-line-soft p-2">Vercel Inc.</td>
      <td class="border border-gs-line-soft p-2">웹 서비스 호스팅</td>
    </tr>
    <tr>
      <td class="border border-gs-line-soft p-2">OpenAI, L.L.C.</td>
      <td class="border border-gs-line-soft p-2">가짜생각 분석(생각 입력 텍스트만 처리, 식별정보 미전달)</td>
    </tr>
    <tr>
      <td class="border border-gs-line-soft p-2">㈜토스페이먼츠</td>
      <td class="border border-gs-line-soft p-2">결제 처리</td>
    </tr>
  </tbody>
</table>

<h2 class="text-lg font-black mt-8 mb-2">6. 이용자의 권리</h2>
<p>이용자는 언제든지 개인정보 열람·수정·삭제·처리정지를 요청할 수 있으며, 회원 탈퇴를 통해 즉시 파기 요청이 가능합니다.</p>

<h2 class="text-lg font-black mt-8 mb-2">7. 개인정보 보호책임자</h2>
<p>개인정보 처리에 관한 문의·민원은 아래 연락처로 부탁드립니다.</p>
<ul class="list-disc pl-6">
  <li>책임자: 개인정보보호 담당자</li>
  <li>이메일: <a href="mailto:{{contact_email}}" class="text-gs-blue-hover underline">{{contact_email}}</a></li>
</ul>

<h2 class="text-lg font-black mt-8 mb-2">8. 개정</h2>
<p>본 방침은 법령·서비스 변경에 따라 개정될 수 있으며, 개정 시 최소 7일 전 공지합니다.</p>
`;

const FALLBACK_SETTINGS: Record<string, string> = {
  service_name: "가짜생각",
  company_name: "마인드시어터",
  contact_email: "support@mindreframe.net",
  effective_date: "2026-05-01",
  footer_address: "",
  terms_html: FALLBACK_TERMS_HTML,
  privacy_html: FALLBACK_PRIVACY_HTML,
};

export async function getSiteSettings(): Promise<Record<string, string>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("site_settings").select("key, value");

    if (error || !data || data.length === 0) return { ...FALLBACK_SETTINGS };

    const out: Record<string, string> = { ...FALLBACK_SETTINGS };
    for (const row of data) {
      if (row.key && typeof row.value === "string") {
        out[row.key] = row.value;
      }
    }
    return out;
  } catch {
    return { ...FALLBACK_SETTINGS };
  }
}

/**
 * {{key}} placeholder를 settings 값으로 치환.
 * 정의되지 않은 키는 빈 문자열로 치환하지 않고 원본(`{{key}}`)을 유지 — 운영자 오타 silent fail 방지.
 * 개발 환경에서는 console.warn으로 알림.
 */
export function applyPlaceholders(html: string, settings: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      return settings[key];
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[site-settings] applyPlaceholders: 정의되지 않은 키 "${key}" — 원본 유지`);
    }
    return match;
  });
}
