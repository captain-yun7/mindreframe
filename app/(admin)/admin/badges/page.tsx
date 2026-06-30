import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeSearchTerm } from "@/lib/utils";
import { PageHeader } from "../_ui/page-header";
import { AdminTable, type Column } from "../_ui/admin-table";
import { Pagination } from "../_ui/pagination";
import { SearchFilterBar } from "../_ui/search-filter-bar";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

interface BadgeRow {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
}

export default async function AdminBadgesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1"));

  let query = supabaseAdmin
    .from("badges")
    .select("id, key, title, description, icon", { count: "exact" })
    .order("key", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const safeQ = sanitizeSearchTerm(q);
  if (safeQ) query = query.or(`title.ilike.%${safeQ}%,key.ilike.%${safeQ}%`);

  const { data, count, error } = await query;
  const rows = (data ?? []) as BadgeRow[];

  // 보유자 수 집계 (페이지 내 뱃지들만)
  const holderCounts = new Map<string, number>();
  if (rows.length > 0) {
    const { data: ub } = await supabaseAdmin
      .from("user_badges")
      .select("badge_id")
      .in(
        "badge_id",
        rows.map((r) => r.id),
      );
    for (const r of (ub ?? []) as { badge_id: string }[]) {
      holderCounts.set(r.badge_id, (holderCounts.get(r.badge_id) ?? 0) + 1);
    }
  }

  const tableMissing = error?.code === "42P01";

  const columns: Column<BadgeRow>[] = [
    {
      key: "icon",
      header: "아이콘",
      align: "center",
      cell: (r) => <span className="text-lg">{r.icon}</span>,
    },
    {
      key: "key",
      header: "키 (코드)",
      cell: (r) => (
        <span className="font-mono text-xs text-gs-muted">{r.key}</span>
      ),
    },
    {
      key: "title",
      header: "제목",
      cell: (r) => (
        <Link
          href={`/admin/badges/${r.id}/edit`}
          className="font-bold text-gs-navy-900 hover:text-gs-blue hover:underline"
        >
          {r.title}
        </Link>
      ),
    },
    {
      key: "description",
      header: "설명",
      hideOnMobile: true,
      cell: (r) => (
        <span className="text-gs-muted line-clamp-2 max-w-[360px]">
          {r.description}
        </span>
      ),
    },
    {
      key: "holders",
      header: "보유자",
      align: "right",
      cell: (r) => (
        <span className="tabular-nums">
          {(holderCounts.get(r.id) ?? 0).toLocaleString("ko-KR")}명
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Link
          href={`/admin/badges/${r.id}/edit`}
          className="text-[13px] font-bold text-gs-blue hover:underline"
        >
          수정·부여
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="뱃지 관리"
        desc="뱃지를 만들고 유저에게 수동으로 부여·회수합니다."
        backHref="/admin"
        backLabel="← 대시보드"
        actions={
          <Link href="/admin/badges/new">
            <Button>+ 새 뱃지</Button>
          </Link>
        }
      />

      {tableMissing ? (
        <div className="mb-4 p-4 bg-gs-warn-bg border border-gs-warn-border rounded-[10px] text-sm text-gs-warn">
          badges 테이블이 아직 생성되지 않았습니다. 마이그레이션을 적용해주세요.
        </div>
      ) : null}

      <SearchFilterBar
        action="/admin/badges"
        searchValue={q}
        searchPlaceholder="제목/키 검색"
      />

      <AdminTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={{
          title: "뱃지가 없습니다",
          desc: "+ 새 뱃지 버튼으로 첫 뱃지를 만들어보세요.",
        }}
      />

      <Pagination
        basePath="/admin/badges"
        searchParams={{ q }}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={count ?? 0}
      />
    </div>
  );
}
