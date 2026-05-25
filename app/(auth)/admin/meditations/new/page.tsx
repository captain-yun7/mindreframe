import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { requireAdmin } from "@/lib/auth/admin";
import { MeditationForm } from "../meditation-form";

export default async function AdminMeditationsNewPage() {
  await requireAdmin();
  return (
    <PageLayout>
      <Link href="/admin/meditations" className="text-sm text-gs-blue">
        ← 명상 목록
      </Link>
      <PageTitle>새 명상 트랙</PageTitle>
      <div className="mt-6">
        <MeditationForm mode="create" />
      </div>
    </PageLayout>
  );
}
