import { PageHeader } from "../_ui/page-header";
import { requireAdmin } from "@/lib/auth/admin";
import { SettingsForm } from "./settings-form";

interface SettingRow {
  key: string;
  value: string;
  description: string | null;
}

// H3: 누락된 key에 대한 default description (DB seed 미적용 환경 대비)
const KEY_DESCRIPTIONS: Record<string, string> = {
  service_name: "서비스명",
  company_name: "회사명",
  contact_email: "고객문의 이메일",
  effective_date: "약관 시행일",
  footer_address: "회사 주소 (Sprint C 보류)",
  landing_hero_title: "랜딩 hero h1 (HTML 안전: <gold> 태그 허용)",
  landing_hero_subtitle: "랜딩 hero subtitle",
  landing_menu_items: "랜딩 6개 메뉴 (JSON 배열)",
  landing_stats: "랜딩 stats 숫자 (JSON 배열)",
  landing_final_cta: "랜딩 최종 CTA 카피 (JSON 객체)",
  dashboard_hero_subtitle: "대시보드 hero subtitle",
  trash_hero_subtitle: "쓰레기통 hero subtitle",
  progress_hero_subtitle: "성장방 hero subtitle",
  chat_hero_subtitle: "분석기 hero subtitle",
  exercise_hero_subtitle: "행동연습장 hero subtitle",
  meditation_hero_subtitle: "명상 hero subtitle",
  popup_trash_intro: "쓰레기통 첫 진입 팝업 (JSON)",
  popup_chat_intro: "분석기 첫 진입 팝업 (JSON)",
  popup_meditation_focus: "명상 초점 이동 훈련 가이드 (JSON)",
  popup_exercise_step1: "행동연습장 1단계 진입 팝업 (JSON)",
  popup_exercise_step2: "2단계 안내 팝업 (JSON)",
  popup_exercise_step3: "3단계 시작 팝업 (JSON)",
  popup_exercise_step4_praise: "4단계 칭찬 팝업 (JSON)",
  terms_html: "이용약관 본문",
  privacy_html: "개인정보처리방침 본문",
};

// UI 노출 순서 (카테고리 그룹핑) — H3에서 17개 키 확장
const KEY_ORDER = [
  // 시스템
  "service_name",
  "company_name",
  "contact_email",
  "effective_date",
  "footer_address",
  // 랜딩
  "landing_hero_title",
  "landing_hero_subtitle",
  "landing_menu_items",
  "landing_stats",
  "landing_final_cta",
  // 페이지 hero subtitle
  "dashboard_hero_subtitle",
  "trash_hero_subtitle",
  "progress_hero_subtitle",
  "chat_hero_subtitle",
  "exercise_hero_subtitle",
  "meditation_hero_subtitle",
  // 팝업
  "popup_trash_intro",
  "popup_chat_intro",
  "popup_meditation_focus",
  "popup_exercise_step1",
  "popup_exercise_step2",
  "popup_exercise_step3",
  "popup_exercise_step4_praise",
  // 약관·방침 (긴 HTML)
  "terms_html",
  "privacy_html",
];

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("site_settings")
    .select("key, value, description");

  const existing = (data ?? []) as SettingRow[];
  const existingKeys = new Set(existing.map((r) => r.key));

  // 누락된 키는 빈 값으로 placeholder row 추가 (어드민이 INSERT할 수 있도록 노출)
  const missing: SettingRow[] = KEY_ORDER.filter((k) => !existingKeys.has(k)).map(
    (k) => ({
      key: k,
      value: "",
      description: KEY_DESCRIPTIONS[k] ?? null,
    }),
  );

  const rows = [...existing, ...missing].sort((a, b) => {
    const ai = KEY_ORDER.indexOf(a.key);
    const bi = KEY_ORDER.indexOf(b.key);
    if (ai < 0 && bi < 0) return a.key.localeCompare(b.key);
    if (ai < 0) return 1;
    if (bi < 0) return -1;
    return ai - bi;
  });

  return (
    <>
      <PageHeader
        title="사이트 설정"
        desc={
          <>
            푸터·약관·방침에 표시되는 값. 변경 시 사용자 페이지에 즉시 반영됩니다.
            본문(terms_html / privacy_html)은 HTML로 작성하며 {`{{service_name}}`},{" "}
            {`{{company_name}}`}, {`{{contact_email}}`} placeholder를 사용할 수 있습니다.
          </>
        }
      />
      {rows.length === 0 ? (
        <div className="mt-6 p-6 bg-gs-warn-bg border border-gs-warn-border rounded-[14px] text-sm">
          <p className="font-bold text-gs-warn">site_settings 테이블이 비어 있습니다.</p>
          <p className="mt-2 text-gs-warn">
            <code>supabase/migrations/20260526_site_settings.sql</code> +{" "}
            <code>20260526_site_settings_seed.sql</code>을 적용해주세요.
          </p>
        </div>
      ) : (
        <SettingsForm rows={rows} />
      )}
    </>
  );
}
