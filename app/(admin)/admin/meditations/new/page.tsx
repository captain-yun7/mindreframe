import { PageHeader } from "../../_ui/page-header";
import { requireAdmin } from "@/lib/auth/admin";
import { MeditationForm } from "../meditation-form";

export default async function AdminMeditationsNewPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        backHref="/admin/meditations"
        backLabel="← 명상 목록"
        title="새 명상 트랙"
      />
      <div className="mt-6">
        <MeditationForm mode="create" />
      </div>
    </>
  );
}
