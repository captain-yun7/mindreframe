import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "../../_ui/page-header";
import { ExerciseForm } from "../exercise-form";

export default async function AdminExerciseNewPage() {
  const { data } = await supabaseAdmin
    .from("exercises")
    .select("category")
    .order("category", { ascending: true });
  const categories = Array.from(
    new Set(((data ?? []) as { category: string }[]).map((r) => r.category)),
  ).filter(Boolean);

  return (
    <div>
      <PageHeader
        title="새 운동"
        backHref="/admin/exercises"
        backLabel="← 운동 카탈로그"
      />
      <ExerciseForm mode="create" categories={categories} />
    </div>
  );
}
