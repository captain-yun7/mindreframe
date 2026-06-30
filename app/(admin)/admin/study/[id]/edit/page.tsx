import { notFound } from "next/navigation";
import { PageHeader } from "../../../_ui/page-header";
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
  video_url: string | null;
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
    .select("id, slug, category, title, sub, body_html, order_index, video_url, required_plan")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const row = data as ArticleRow;

  return (
    <>
      <PageHeader
        backHref="/admin/study"
        backLabel="← 알고가기 목록"
        title="알고가기 수정"
      />
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
            videoUrl: row.video_url ?? "",
            requiredPlan: (row.required_plan as "" | "pro") ?? "",
          }}
        />
      </div>
    </>
  );
}
