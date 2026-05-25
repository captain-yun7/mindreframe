import { notFound } from "next/navigation";
import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { requireAdmin } from "@/lib/auth/admin";
import { StudyForm } from "../../study-form";

interface ArticleRow {
  id: string;
  slug: string;
  category: "core" | "distortion" | "body" | "avoidance" | "rumination";
  title: string;
  sub: string | null;
  body_html: string;
  order_index: number;
  video_id: string | null;
  required_plan: string | null;
}

export default async function AdminStudyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("study_articles")
    .select("id, slug, category, title, sub, body_html, order_index, video_id, required_plan")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const row = data as ArticleRow;

  return (
    <PageLayout>
      <Link href="/admin/study" className="text-sm text-gs-blue">
        ← 알고가기 목록
      </Link>
      <PageTitle>알고가기 수정</PageTitle>
      <div className="mt-6">
        <StudyForm
          mode="edit"
          initial={{
            id: row.id,
            slug: row.slug,
            category: row.category,
            title: row.title,
            sub: row.sub ?? "",
            bodyHtml: row.body_html,
            orderIndex: row.order_index,
            videoId: row.video_id ?? "",
            requiredPlan: (row.required_plan as "" | "pro") ?? "",
          }}
        />
      </div>
    </PageLayout>
  );
}
