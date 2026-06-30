import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "../../../_ui/page-header";
import { BadgeForm } from "../../badge-form";
import { GrantPanel, type Holder } from "../grant-panel";

interface BadgeRow {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  condition: unknown;
}

interface HolderRow {
  user_id: string;
  earned_at: string | null;
  users: { email: string | null; nickname: string | null } | null;
}

export default async function AdminBadgeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data } = await supabaseAdmin
    .from("badges")
    .select("id, key, title, description, icon, condition")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const row = data as BadgeRow;

  const { data: ub } = await supabaseAdmin
    .from("user_badges")
    .select("user_id, earned_at, users(email, nickname)")
    .eq("badge_id", id)
    .order("earned_at", { ascending: false });

  const holders: Holder[] = ((ub ?? []) as unknown as HolderRow[]).map((h) => ({
    userId: h.user_id,
    email: h.users?.email ?? null,
    nickname: h.users?.nickname ?? null,
    earnedAt: h.earned_at,
  }));

  let conditionStr = "{}";
  try {
    conditionStr = JSON.stringify(row.condition ?? {}, null, 2);
  } catch {
    conditionStr = "{}";
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`뱃지 수정 — ${row.title}`}
        backHref="/admin/badges"
        backLabel="← 뱃지 목록"
      />

      <BadgeForm
        mode="edit"
        initial={{
          id: row.id,
          key: row.key,
          title: row.title,
          description: row.description,
          icon: row.icon,
          condition: conditionStr,
        }}
      />

      <GrantPanel badgeId={row.id} holders={holders} />
    </div>
  );
}
