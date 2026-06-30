import { requireAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "../_ui/page-header";
import { StatCard } from "../_ui/stat-card";
import { StatusBadge } from "../_ui/status-badge";
import { SearchFilterBar } from "../_ui/search-filter-bar";
import { AdminTable, type Column } from "../_ui/admin-table";
import { Pagination } from "../_ui/pagination";
import { EmptyState } from "../_ui/empty-state";
import { fmtDate } from "../_ui/lib/fmt";
import type { BadgeTone } from "../_ui/lib/labels";
import { ExportButton, type SurveyExportRow } from "./export-button";

const PAGE_SIZE = 50;
const BASE_PATH = "/admin/surveys";

interface SurveyRow {
  id: string;
  user_id: string;
  channel: string | null;
  gender: string | null;
  age_group: string | null;
  concern_areas: string[] | null;
  depression_score: number | null;
  depression_severity: string | null;
  anxiety_score: number | null;
  anxiety_severity: string | null;
  recommended_track: string | null;
  created_at: string;
}

interface UserLite {
  id: string;
  nickname: string | null;
  email: string | null;
}

const SEVERITY_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  minimal: { label: "정상", tone: "success" },
  none: { label: "정상", tone: "success" },
  mild: { label: "경미", tone: "neutral" },
  moderate: { label: "중등도", tone: "warning" },
  moderately_severe: { label: "중등도-중증", tone: "warning" },
  severe: { label: "중증", tone: "danger" },
};

const SEVERITY_OPTIONS = [
  { value: "", label: "전체 중증도" },
  { value: "minimal", label: "정상" },
  { value: "mild", label: "경미" },
  { value: "moderate", label: "중등도" },
  { value: "moderately_severe", label: "중등도-중증" },
  { value: "severe", label: "중증" },
];

function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01";
}

function severityBadge(severity: string | null) {
  if (!severity) return null;
  const entry = SEVERITY_LABEL[severity] ?? {
    label: severity,
    tone: "neutral" as BadgeTone,
  };
  return <StatusBadge tone={entry.tone}>{entry.label}</StatusBadge>;
}

export default async function AdminSurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; severity?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const severity = params.severity ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));

  await requireAdmin();

  // q(이메일/닉네임) → user_id in-filter
  let userIdFilter: string[] | null = null;
  if (q) {
    const { data: matched } = await supabaseAdmin
      .from("users")
      .select("id")
      .or(`email.ilike.%${q}%,nickname.ilike.%${q}%`)
      .limit(500);
    userIdFilter = (matched ?? []).map((u) => u.id as string);
    // 매칭 0건이면 빈 결과 보장용 더미
    if (userIdFilter.length === 0) userIdFilter = ["00000000-0000-0000-0000-000000000000"];
  }

  let query = supabaseAdmin
    .from("survey_responses")
    .select(
      "id, user_id, channel, gender, age_group, concern_areas, depression_score, depression_severity, anxiety_score, anxiety_severity, recommended_track, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (severity) {
    query = query.or(
      `depression_severity.eq.${severity},anxiety_severity.eq.${severity}`,
    );
  }
  if (userIdFilter) query = query.in("user_id", userIdFilter);

  const res = (await query) as {
    data: SurveyRow[] | null;
    count: number | null;
    error: { code?: string; message: string } | null;
  };

  const tableMissing = isMissingTable(res.error);
  const rows = res.data ?? [];
  const totalCount = res.count ?? 0;

  // 통계 — 전체 응답 수 + 평균(현재 필터 무관, 표본은 별도 집계 조회)
  let totalResponses = 0;
  let avgDepression: number | null = null;
  let avgAnxiety: number | null = null;
  if (!tableMissing) {
    const totalRes = await supabaseAdmin
      .from("survey_responses")
      .select("id", { count: "exact", head: true });
    totalResponses = totalRes.count ?? 0;

    const { data: scoreRows } = await supabaseAdmin
      .from("survey_responses")
      .select("depression_score, anxiety_score")
      .limit(5000);
    const dep = (scoreRows ?? [])
      .map((r) => r.depression_score as number | null)
      .filter((v): v is number => typeof v === "number");
    const anx = (scoreRows ?? [])
      .map((r) => r.anxiety_score as number | null)
      .filter((v): v is number => typeof v === "number");
    if (dep.length > 0)
      avgDepression = dep.reduce((a, b) => a + b, 0) / dep.length;
    if (anx.length > 0) avgAnxiety = anx.reduce((a, b) => a + b, 0) / anx.length;
  }

  // 유저 매핑
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const userMap = new Map<string, UserLite>();
  if (userIds.length > 0) {
    const { data: usersData } = await supabaseAdmin
      .from("users")
      .select("id, nickname, email")
      .in("id", userIds);
    for (const u of (usersData ?? []) as UserLite[]) userMap.set(u.id, u);
  }

  const columns: Column<SurveyRow>[] = [
    {
      key: "created_at",
      header: "응답일",
      cell: (r) => (
        <span className="text-[13px] whitespace-nowrap">
          {fmtDate(r.created_at)}
        </span>
      ),
    },
    {
      key: "user",
      header: "유저",
      cell: (r) => {
        const u = userMap.get(r.user_id);
        return (
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-gs-text-strong truncate">
              {u?.nickname ?? "사용자"}
            </div>
            <div className="text-[11px] text-gs-muted truncate">
              {u?.email ?? r.user_id.slice(0, 8)}
            </div>
          </div>
        );
      },
    },
    {
      key: "demo",
      header: "성별/연령",
      cell: (r) => (
        <span className="text-[13px] text-gs-text-strong whitespace-nowrap">
          {[r.gender, r.age_group].filter(Boolean).join(" / ") || "-"}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "concern",
      header: "관심영역",
      cell: (r) => (
        <span className="text-[12px] text-gs-muted">
          {r.concern_areas && r.concern_areas.length > 0
            ? r.concern_areas.join(", ")
            : "-"}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "depression",
      header: "우울",
      cell: (r) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[13px] font-bold tabular-nums">
            {r.depression_score ?? "-"}
          </span>
          {severityBadge(r.depression_severity)}
        </div>
      ),
    },
    {
      key: "anxiety",
      header: "불안",
      cell: (r) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[13px] font-bold tabular-nums">
            {r.anxiety_score ?? "-"}
          </span>
          {severityBadge(r.anxiety_severity)}
        </div>
      ),
    },
    {
      key: "track",
      header: "추천트랙",
      cell: (r) => (
        <span className="text-[13px] text-gs-text-strong">
          {r.recommended_track ?? "-"}
        </span>
      ),
      hideOnMobile: true,
    },
  ];

  const exportRows: SurveyExportRow[] = rows.map((r) => {
    const u = userMap.get(r.user_id);
    return {
      created_at: fmtDate(r.created_at),
      nickname: u?.nickname ?? "",
      email: u?.email ?? "",
      gender: r.gender ?? "",
      age_group: r.age_group ?? "",
      concern_areas: (r.concern_areas ?? []).join(", "),
      depression_score: r.depression_score?.toString() ?? "",
      depression_severity: r.depression_severity ?? "",
      anxiety_score: r.anxiety_score?.toString() ?? "",
      anxiety_severity: r.anxiety_severity ?? "",
      recommended_track: r.recommended_track ?? "",
    };
  });

  return (
    <>
      <PageHeader
        title="설문 응답"
        desc="자가진단 설문 결과 (읽기 전용)"
        actions={<ExportButton rows={exportRows} />}
      />

      {tableMissing ? (
        <div className="bg-white rounded-[14px] border border-gs-line-soft shadow-gs-card">
          <EmptyState
            title="설문 응답 테이블이 아직 없습니다"
            desc="survey_responses 테이블이 생성되지 않았습니다. 마이그레이션 적용 후 표시됩니다."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4 max-sm:grid-cols-1">
            <StatCard
              label="전체 응답"
              value={totalResponses.toLocaleString("ko-KR")}
            />
            <StatCard
              label="평균 우울점수"
              value={avgDepression !== null ? avgDepression.toFixed(1) : "-"}
            />
            <StatCard
              label="평균 불안점수"
              value={avgAnxiety !== null ? avgAnxiety.toFixed(1) : "-"}
            />
          </div>

          <SearchFilterBar
            action={BASE_PATH}
            searchName="q"
            searchValue={q}
            searchPlaceholder="이메일 또는 닉네임 검색"
            filters={[
              {
                name: "severity",
                label: "중증도",
                value: severity,
                options: SEVERITY_OPTIONS,
              },
            ]}
          />

          <AdminTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            empty={{
              title: "설문 응답이 없습니다",
              desc:
                q || severity ? "검색/필터 조건에 맞는 응답이 없습니다." : undefined,
            }}
          />

          <Pagination
            basePath={BASE_PATH}
            searchParams={{ q: q || undefined, severity: severity || undefined }}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
          />
        </>
      )}
    </>
  );
}
