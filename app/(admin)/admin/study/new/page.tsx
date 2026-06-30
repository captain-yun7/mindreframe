import { PageHeader } from "../../_ui/page-header";
import { requireAdmin } from "@/lib/auth/admin";
import { StudyForm } from "../study-form";

export default async function AdminStudyNewPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        backHref="/admin/study"
        backLabel="← 알고가기 목록"
        title="새 알고가기 글"
      />
      <div className="mt-6">
        <StudyForm mode="create" />
      </div>
    </>
  );
}
