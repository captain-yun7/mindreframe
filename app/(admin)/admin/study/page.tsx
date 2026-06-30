import Link from "next/link";
import { PageHeader } from "../_ui/page-header";
import { Card } from "@/components/card";
import { requireAdmin } from "@/lib/auth/admin";
import { sanitizeSearchTerm } from "@/lib/utils";

const PAGE_SIZE = 50;

const CATEGORY_LABELS: Record<string, string> = {
  core: "필수",
  distortion: "인지왜곡",
  body: "불안과 몸",
  avoidance: "회피와 행동",
  rumination: "반추",
};

interface ArticleRow {
  id: string;
  slug: string;
  category: string;
  title: string;
  order_index: number;
  video_url: string | null;
  required_plan: string | null;
  updated_at: string;
}

export default async function AdminStudyPage({
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
    .from("study_articles")
    .select(
      "id, slug, category, title, order_index, video_url, required_plan, updated_at",
      { count: "exact" },
    )
    .order("category", { ascending: true })
    .order("order_index", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (category) query = query.eq("category", category);
  const safeQ = sanitizeSearchTerm(q);
  if (safeQ) query = query.or(`title.ilike.%${safeQ}%,slug.ilike.%${safeQ}%`);

  const { data, count, error } = await query;
  const rows = (data ?? []) as ArticleRow[];

  return (
    <>
      <PageHeader
        title="알고가기 콘텐츠"
        actions={
          <>
            <Link
              href="/admin/study/videos"
              className="px-3 py-1.5 rounded-[10px] bg-white border border-gs-line-soft text-sm hover:bg-gs-surface-mid"
            >
              100일 알림 영상
            </Link>
            <Link
              href="/admin/study/new"
              className="px-3 py-1.5 rounded-[10px] bg-gs-blue text-white text-sm font-bold"
            >
              + 새 글
            </Link>
          </>
        }
      />
      <div className="text-xs text-gs-muted mb-4">총 {count ?? 0}개</div>

      {error ? (
        <div className="p-4 bg-gs-warn-bg border border-gs-warn-border rounded-[10px] text-sm text-gs-warn mb-4">
          study_articles 테이블이 아직 생성되지 않았습니다.{" "}
          <code>supabase/migrations/20260526_study_articles.sql</code> +{" "}
          <code>20260526_study_articles_seed.sql</code>을 적용해주세요.
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
              <th className="px-3 py-2">영상</th>
              <th className="px-3 py-2">최근 수정</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gs-muted">
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
                      href={`/admin/study/${r.id}/edit`}
                      className="text-gs-blue font-bold hover:underline"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono">{r.slug}</td>
                  <td className="px-3 py-2 text-xs">{r.video_url ? "🎬" : "-"}</td>
                  <td className="px-3 py-2 text-xs text-gs-muted">
                    {new Date(r.updated_at).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
