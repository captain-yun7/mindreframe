import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeSearchTerm } from "@/lib/utils";
import { PageHeader } from "../_ui/page-header";
import { AdminTable, type Column } from "../_ui/admin-table";
import { Pagination } from "../_ui/pagination";
import { SearchFilterBar } from "../_ui/search-filter-bar";
import { StatusBadge } from "../_ui/status-badge";
import { fmtDate } from "../_ui/lib/fmt";
import { ExerciseDeleteButton } from "./exercise-delete-button";

const PAGE_SIZE = 50;

interface ExerciseRow {
  id: string;
  title: string;
  category: string;
  difficulty: number | null;
  sort_order: number | null;
  created_at: string | null;
}

export default async function AdminExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const category = params.category ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));

  // 카테고리 필터 옵션 (데이터에서 distinct 추출)
  const { data: catData } = await supabaseAdmin
    .from("exercises")
    .select("category")
    .order("category", { ascending: true });
  const categories = Array.from(
    new Set(((catData ?? []) as { category: string }[]).map((r) => r.category)),
  ).filter(Boolean);

  let query = supabaseAdmin
    .from("exercises")
    .select("id, title, category, difficulty, sort_order, created_at", {
      count: "exact",
    })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (category) query = query.eq("category", category);
  const safeQ = sanitizeSearchTerm(q);
  if (safeQ) query = query.ilike("title", `%${safeQ}%`);

  const { data, count, error } = await query;
  const tableMissing = error?.code === "42P01";
  const rows = (data ?? []) as ExerciseRow[];

  const columns: Column<ExerciseRow>[] = [
    {
      key: "title",
      header: "제목",
      cell: (r) => (
        <Link
          href={`/admin/exercises/${r.id}/edit`}
          className="text-gs-blue font-bold hover:underline"
        >
          {r.title}
        </Link>
      ),
    },
    {
      key: "category",
      header: "카테고리",
      cell: (r) => <StatusBadge tone="primary">{r.category}</StatusBadge>,
    },
    {
      key: "difficulty",
      header: "난이도",
      align: "center",
      cell: (r) => (
        <span title={`난이도 ${r.difficulty ?? 1}`}>
          {"★".repeat(r.difficulty ?? 1)}
        </span>
      ),
    },
    {
      key: "sort_order",
      header: "정렬순서",
      align: "right",
      hideOnMobile: true,
      cell: (r) => r.sort_order ?? 0,
    },
    {
      key: "created_at",
      header: "생성일",
      hideOnMobile: true,
      cell: (r) => (
        <span className="text-gs-muted text-xs">{fmtDate(r.created_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => <ExerciseDeleteButton id={r.id} title={r.title} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="운동 카탈로그"
        desc={`총 ${count ?? 0}개`}
        backHref="/admin"
        backLabel="← 대시보드"
        actions={
          <Link
            href="/admin/exercises/new"
            className="px-3 py-2 rounded-[10px] bg-gs-navy-900 text-white text-sm font-bold hover:bg-gs-navy-800 transition-colors"
          >
            + 새 운동
          </Link>
        }
      />

      {tableMissing ? (
        <div className="p-4 bg-gs-warn-bg border border-gs-warn-border rounded-[10px] text-sm text-gs-warn mb-4">
          exercises 테이블이 아직 생성되지 않았습니다. 마이그레이션을 적용해주세요.
        </div>
      ) : null}

      <SearchFilterBar
        action="/admin/exercises"
        searchName="q"
        searchValue={q}
        searchPlaceholder="제목 검색"
        filters={[
          {
            name: "category",
            label: "카테고리",
            value: category,
            options: [
              { value: "", label: "전체 카테고리" },
              ...categories.map((c) => ({ value: c, label: c })),
            ],
          },
        ]}
      />

      <AdminTable<ExerciseRow>
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={{ title: "운동이 없습니다", desc: "새 운동을 추가해보세요." }}
      />

      <Pagination
        basePath="/admin/exercises"
        searchParams={{ q, category }}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={count ?? 0}
      />
    </div>
  );
}
