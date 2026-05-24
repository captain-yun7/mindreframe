import Link from "next/link";
import { PageLayout, PageTitle, PageLead } from "@/components/page-layout";
import { requireAdmin } from "@/lib/auth/admin";
import { SettingsForm } from "./settings-form";

interface SettingRow {
  key: string;
  value: string;
  description: string | null;
}

// 7개 기본 키 순서 (UI 노출 순서 고정)
const KEY_ORDER = [
  "service_name",
  "company_name",
  "contact_email",
  "effective_date",
  "footer_address",
  "terms_html",
  "privacy_html",
];

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("site_settings")
    .select("key, value, description");

  const rows = ((data ?? []) as SettingRow[]).sort((a, b) => {
    const ai = KEY_ORDER.indexOf(a.key);
    const bi = KEY_ORDER.indexOf(b.key);
    if (ai < 0 && bi < 0) return a.key.localeCompare(b.key);
    if (ai < 0) return 1;
    if (bi < 0) return -1;
    return ai - bi;
  });

  return (
    <PageLayout>
      <Link href="/admin" className="text-sm text-gs-blue">
        ← 대시보드
      </Link>
      <PageTitle>사이트 설정</PageTitle>
      <PageLead>
        푸터·약관·방침에 표시되는 값. 변경 시 사용자 페이지에 즉시 반영됩니다.
        본문(terms_html / privacy_html)은 HTML로 작성하며 {`{{service_name}}`},{" "}
        {`{{company_name}}`}, {`{{contact_email}}`} placeholder를 사용할 수 있습니다.
      </PageLead>
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
    </PageLayout>
  );
}
