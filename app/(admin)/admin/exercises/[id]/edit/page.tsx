import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "../../../_ui/page-header";
import { ExerciseForm } from "../../exercise-form";

interface ExerciseRow {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: number | null;
  sort_order: number | null;
}

export default async function AdminExerciseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data } = await supabaseAdmin
    .from("exercises")
    .select("id, title, description, category, difficulty, sort_order")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const row = data as ExerciseRow;

  const { data: catData } = await supabaseAdmin
    .from("exercises")
    .select("category")
    .order("category", { ascending: true });
  const categories = Array.from(
    new Set(((catData ?? []) as { category: string }[]).map((r) => r.category)),
  ).filter(Boolean);

  return (
    <div>
      <PageHeader
        title="운동 수정"
        desc={row.title}
        backHref="/admin/exercises"
        backLabel="← 운동 카탈로그"
      />
      <ExerciseForm
        mode="edit"
        categories={categories}
        initial={{
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category,
          difficulty: row.difficulty ?? 1,
          sortOrder: row.sort_order ?? 0,
        }}
      />
    </div>
  );
}
