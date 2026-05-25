import { notFound } from "next/navigation";
import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { requireAdmin } from "@/lib/auth/admin";
import { MeditationForm } from "../../meditation-form";

interface MeditationRow {
  id: string;
  slug: string;
  category: "person" | "nature" | "music";
  title: string;
  description: string | null;
  duration_seconds: number;
  audio_url: string | null;
  video_id: string | null;
  order_index: number;
  required_plan: string | null;
}

export default async function AdminMeditationEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("meditations")
    .select(
      "id, slug, category, title, description, duration_seconds, audio_url, video_id, order_index, required_plan",
    )
    .eq("id", id)
    .single();

  if (!data) notFound();
  const row = data as MeditationRow;

  return (
    <PageLayout>
      <Link href="/admin/meditations" className="text-sm text-gs-blue">
        ← 명상 목록
      </Link>
      <PageTitle>명상 트랙 수정</PageTitle>
      <div className="mt-6">
        <MeditationForm
          mode="edit"
          initial={{
            id: row.id,
            slug: row.slug,
            category: row.category,
            title: row.title,
            description: row.description ?? "",
            durationSeconds: row.duration_seconds,
            audioUrl: row.audio_url ?? "",
            videoId: row.video_id ?? "",
            orderIndex: row.order_index,
            requiredPlan: (row.required_plan as "" | "pro") ?? "",
          }}
        />
      </div>
    </PageLayout>
  );
}
