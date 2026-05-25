import Link from "next/link";
import { PageLayout, PageTitle } from "@/components/page-layout";
import { Card } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";

const PAGE_SIZE = 50;

const CATEGORY_LABELS: Record<string, string> = {
  person: "사람(가이드)",
  nature: "자연",
  music: "음악",
};

interface Row {
  id: string;
  slug: string;
  category: string;
  title: string;
  duration_seconds: number;
  audio_url: string | null;
  video_id: string | null;
  order_index: number;
  required_plan: string | null;
  updated_at: string;
}

export default async function AdminMeditationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const category = params.category ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));

  const { supabase } = await requireAdmin();

  let query = supabase
    .from("meditations")
    .select(
      "id, slug, category, title, duration_seconds, audio_url, video_id, order_index, required_plan, updated_at",
      { count: "exact" },
    )
    .order("category", { ascending: true })
    .order("order_index", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (category) query = query.eq("category", category);
  if (q) query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);

  const { data, count, error } = await query;
  const rows = (data ?? []) as Row[];

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <Link href="/admin" className="text-sm text-gs-blue">
          ← 대시보드
        </Link>
        <Link
          href="/admin/meditations/new"
          className="px-3 py-1.5 rounded-[10px] bg-gs-blue text-white text-sm font-bold"
        >
          + 새 트랙
        </Link>
      </div>
      <PageTitle>명상 콘텐츠</PageTitle>
      <div className="text-xs text-gs-muted mb-4">총 {count ?? 0}개</div>

      {error ? (
        <div className="p-4 bg-gs-warn-bg border border-gs-warn-border rounded-[10px] text-sm text-gs-warn mb-4">
          meditations 테이블이 아직 생성되지 않았습니다.{" "}
          <code>supabase/migrations/20260526_meditations.sql</code> +{" "}
          <code>20260526_meditations_seed.sql</code>을 적용해주세요.
        </div>
      ) : null}

      <Card className="p-4 mb-4">
        <form method="GET" className="flex gap-2 flex-wrap">
          <select
            name="category"
            defaultValue={category}
            className="px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
          >
            <option value="">전체 카테고리</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="제목/slug 검색"
            className="flex-1 px-3 py-2 rounded-[10px] border border-gs-line-soft text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-[10px] bg-gs-blue text-white text-sm font-bold"
          >
            검색
          </button>
        </form>
      </Card>

      <div className="bg-white rounded-[14px] border border-gs-line-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gs-surface-muted border-b border-gs-line-soft">
            <tr className="text-left text-xs text-gs-muted">
              <th className="px-3 py-2">카테고리</th>
              <th className="px-3 py-2">순서</th>
              <th className="px-3 py-2">제목</th>
              <th className="px-3 py-2">slug</th>
              <th className="px-3 py-2">길이</th>
              <th className="px-3 py-2">매체</th>
              <th className="px-3 py-2">최근 수정</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gs-muted">
                  결과 없음
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gs-line-soft hover:bg-gs-surface-muted/50"
                >
                  <td className="px-3 py-2 text-xs">
                    {CATEGORY_LABELS[r.category] ?? r.category}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.order_index}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/meditations/${r.id}/edit`}
                      className="text-gs-blue font-bold hover:underline"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono">{r.slug}</td>
                  <td className="px-3 py-2 text-xs">
                    {Math.round(r.duration_seconds / 60)}분
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.audio_url ? "🎧" : ""}
                    {r.video_id ? "🎬" : ""}
                    {!r.audio_url && !r.video_id ? "-" : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-gs-muted">
                    {new Date(r.updated_at).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}
