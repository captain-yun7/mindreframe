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

// H3: 랜딩·페이지 hero·팝업 콘텐츠 fallback (DB 마이그 미적용 시에도 페이지 정상 동작)
export const FALLBACK_LANDING_HERO_TITLE =
  "우울·불안은 <gold>생각습관</gold>이에요.\n훈련으로만 바뀝니다 🌱";
export const FALLBACK_LANDING_HERO_SUBTITLE =
  "반복되는 '가짜생각'을 하루 20분, 쉽고 짧게.\n100일이면 분명히 달라져요.";

export const FALLBACK_LANDING_MENU_ITEMS =
  '[{"emoji":"💭","title":"가짜생각 분석기","description":"생각 한 줄만 적으면 인지왜곡, 대안사고까지 전부 찾아드려요.","href":"/chat"},{"emoji":"🗑️","title":"생각쓰레기통","description":"여기에 생각을 버리고, 뭉친 마음의 실타래를 푸세요!","href":"/trash"},{"emoji":"🌙","title":"명상하기","description":"초점 이동, 짧고 가볍게 매일.","href":"/meditation"},{"emoji":"🎯","title":"행동연습장","description":"불안 줄이기 연습, 우울 벗어나기 연습. 작은 용기를 쌓으세요.","href":"/exercise"},{"emoji":"🤝","title":"코치 채팅","description":"가짜 생각 코치와 100일을 시작하세요.","href":"/coach"},{"emoji":"🌱","title":"나의 성장방","description":"오늘의 기록이 쌓여 100일의 변화로. 한눈에 확인하세요.","href":"/progress"}]';

export const FALLBACK_LANDING_STATS =
  '[{"value":"10+","label":"함께한 사람들"},{"value":"500+","label":"분석된 생각"},{"value":"100일","label":"훈련 프로그램"}]';

export const FALLBACK_LANDING_FINAL_CTA =
  '{"title":"오늘 시작해보세요 🌱","subtitle":"하루 20분, 100일이면 분명히 달라져요.\\n완벽보다 시작이 중요해요."}';

// K2·F178 — 생각쓰레기통 인트로 팝업 카피 전면 개정
export const FALLBACK_POPUP_TRASH_INTRO =
  '{"title":"왜 생각을 나눌까요?","body":"어떤 일이 생기면 상황·생각·감정·신체반응·행동이 한 덩어리처럼 동시에 터져 나와요.\\n뭉쳐있으면 이것이 사실인지, 내 해석인지 구분할 수 없어 감정에 끌려 행동하게 돼요.\\n나누는 순간, 생각은 생각으로 나는 나로 분리됩니다.\\n나누는 습관으로 뇌는 한 걸음 떨어져 바라봐요. 이것이 변화의 시작이에요.","cta":"시작하기"}';

export const FALLBACK_POPUP_CHAT_INTRO =
  '{"title":"가짜생각 분석기 사용법","body":"① 생각쓰레기통에서 찾은 생각을 쓰거나, 떠오른 자동사고와 감정점수(0~100)를 적으세요.\\n② 분석기가 인지왜곡을 찾아 질문하면 따라가 주세요.\\n③ 객관적으로 거리를 두고, 탐정이 된 듯 답해봅니다.\\n④ 합리적 사고를 함께 찾아요!\\n⑤ 합리적 사고를 외우고 상황에 적용해요. 꼭이요!","cta":"시작하기"}';

export const FALLBACK_POPUP_MEDITATION_FOCUS =
  '{"title":"잠시 쉬어가요 🌙","body":"① 원하는 것을 하나 선택해 보세요. 소리, 호흡, 손에 닿는 물의 감각... 하나면 충분합니다.\\n② 선택한 곳에 잠시 초점을 두어봅니다. 잘하려고 애쓰지 않아도 괜찮습니다.\\n③ 중간에 초점이 흩어져도 괜찮습니다. 알아차렸다면, 다시 원하는 곳으로 돌아오면 됩니다.\\n\\n최소 3분 이상 해봐요!","cta":"오늘 시작하기"}';

// K2·F194 — 행동연습장 1단계 인트로
export const FALLBACK_POPUP_EXERCISE_STEP1 =
  '{"title":"용기 한 걸음 🎯","body":"불안 줄이기 — 피해왔던 상황을 단계적으로 도전해요.\\n우울 벗어나기 — 작은 행동이 기분을 깨워줘요.","cta":"시작하기"}';

// K2·F198/F201 — 2단계 팝업 (불안 줄이기 / 우울 벗어나기 공통 fallback)
export const FALLBACK_POPUP_EXERCISE_STEP2 =
  '{"title":"2단계 목록 만들기","body":"활동 목록을 완성하세요.\\n실행 난이도를 완성하세요.\\n*점수가 높을수록 활동이 어려운 것입니다.","cta":"네, 적어볼게요"}';

// K2·F198/F203 — 3단계 팝업
export const FALLBACK_POPUP_EXERCISE_STEP3 =
  '{"title":"활동을 선택하고 도전하시겠습니까?","body":"표에서 라디오를 체크하면 여기 표시됩니다. 너무 어려운 단계부터 시작하지 말고, 가장 쉬운 것부터 골라보세요.","cta":"도전하기"}';

export const FALLBACK_POPUP_EXERCISE_STEP4_PRAISE =
  '{"title":"용기 레벨 1 획득 🏆","body":"오늘 한 걸음을 내디뎠어요.\\n\\n결과가 아쉬워도, 시도한 사실 자체가 성장이에요. 이 기록은 평생 남아요.","cta":"성장방에서 확인하기"}';

const FALLBACK_SETTINGS: Record<string, string> = {
  service_name: "가짜생각",
  company_name: "마인드시어터",
  contact_email: "support@mindreframe.net",
  effective_date: "2026-05-01",
  footer_address: "",
  terms_html: FALLBACK_TERMS_HTML,
  privacy_html: FALLBACK_PRIVACY_HTML,

  // H3 — 랜딩·페이지 hero
  landing_hero_title: FALLBACK_LANDING_HERO_TITLE,
  landing_hero_subtitle: FALLBACK_LANDING_HERO_SUBTITLE,
  landing_menu_items: FALLBACK_LANDING_MENU_ITEMS,
  landing_stats: FALLBACK_LANDING_STATS,
  landing_final_cta: FALLBACK_LANDING_FINAL_CTA,
  dashboard_hero_subtitle:
    "작은 한 걸음이 큰 변화로 이어져요. 오늘도 1%만 해도 충분해요.",
  trash_hero_subtitle:
    "불안하거나 화가 났던 한 사건을 전부 쏟아놓으세요. 생각쓰레기통이 알아서 상황·생각·감정·신체반응·행동을 나눠줄게요.",
  progress_hero_subtitle:
    "기록은 거짓말하지 않아요. 오늘까지 함께한 흔적을 확인해보세요.",
  chat_hero_subtitle:
    "지금 떠오른 그 생각, 정말 사실일까요? 11가지 인지왜곡 패턴을 함께 찾고 합리적인 대안사고를 만들어 드려요.",
  exercise_hero_subtitle:
    "작은 행동 하나가 가장 강력한 무기예요. 계획 → 선택 → 도전 → 기록으로 한 걸음씩.",
  meditation_hero_subtitle:
    "하루 3분, 한 곳에 초점을 두면 마음이 차분해져요.",

  // H3 — 팝업
  popup_trash_intro: FALLBACK_POPUP_TRASH_INTRO,
  popup_chat_intro: FALLBACK_POPUP_CHAT_INTRO,
  popup_meditation_focus: FALLBACK_POPUP_MEDITATION_FOCUS,
  popup_exercise_step1: FALLBACK_POPUP_EXERCISE_STEP1,
  popup_exercise_step2: FALLBACK_POPUP_EXERCISE_STEP2,
  popup_exercise_step3: FALLBACK_POPUP_EXERCISE_STEP3,
  popup_exercise_step4_praise: FALLBACK_POPUP_EXERCISE_STEP4_PRAISE,
};

/** H3: 팝업/메뉴 JSON 파싱 결과 타입 */
export interface PopupContent {
  title: string;
  body: string;
  cta?: string;
}

export interface LandingMenuItem {
  emoji: string;
  title: string;
  description: string;
  href: string;
}

export interface LandingStatItem {
  value: string;
  label: string;
}

export interface LandingFinalCta {
  title: string;
  subtitle: string;
}

/**
 * site_settings 값(string)을 JSON 객체로 파싱. 실패 시 fallback string을 파싱.
 * 양쪽 다 실패하면 null (운영자 입력 검증을 한 번 더 통과한 상태라 거의 발생 X).
 */
export function parseSettingJson<T>(
  value: string | undefined,
  fallbackJsonString: string,
): T | null {
  const tryParse = (s: string): T | null => {
    try {
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  };
  if (value) {
    const parsed = tryParse(value);
    if (parsed) return parsed;
    if (process.env.NODE_ENV !== "production") {
      console.warn("[site-settings] JSON 파싱 실패, fallback 사용:", value.slice(0, 80));
    }
  }
  return tryParse(fallbackJsonString);
}

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
