import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { requireAdmin } from "@/lib/auth/admin";
import { StudyForm } from "../study-form";

export default async function AdminStudyNewPage() {
  await requireAdmin();
  return (
    <PageLayout>
      <Link href="/admin/study" className="text-sm text-gs-blue">
        ← 알고가기 목록
      </Link>
      <PageTitle>새 알고가기 글</PageTitle>
      <div className="mt-6">
        <StudyForm mode="create" />
      </div>
    </PageLayout>
  );
}
